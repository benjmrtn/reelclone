import logging
import os
import subprocess
from pathlib import Path

import cv2
import pytesseract

logger = logging.getLogger(__name__)

FFMPEG_PATH = os.getenv("FFMPEG_PATH", "ffmpeg")
FRAME_INTERVAL = 0.5
OCR_CONFIDENCE_THRESHOLD = 50
POSITION_TOLERANCE = 0.05


def extract_overlays(video_path: Path, frames_dir: Path) -> list[dict]:
    """
    Extract text overlays from a video via frame sampling + Tesseract OCR.

    Returns grouped overlays: [{id, text, x, y, width, height, start, end, style}]
    """
    _extract_frames(video_path, frames_dir)
    frame_files = sorted(frames_dir.glob("frame_*.jpg"))

    if not frame_files:
        logger.warning("No frames extracted from video")
        return []

    raw_detections: list[dict] = []
    for frame_file in frame_files:
        idx = int(frame_file.stem.split("_")[1])
        timestamp = round((idx - 1) * FRAME_INTERVAL, 2)
        texts = _ocr_frame(frame_file)
        for t in texts:
            t["timestamp"] = timestamp
        raw_detections.extend(texts)

    overlays = _group_overlays(raw_detections)
    logger.info(f"Extracted {len(overlays)} text overlays")
    return overlays


def _extract_frames(video_path: Path, frames_dir: Path) -> None:
    """Sample video at 2fps (every 0.5s) and write JPEGs."""
    cmd = [
        FFMPEG_PATH,
        "-i", str(video_path),
        "-vf", "fps=2",
        str(frames_dir / "frame_%04d.jpg"),
        "-y",
    ]
    subprocess.run(cmd, capture_output=True, check=True)
    logger.info(f"Frames extracted to {frames_dir}")


def _ocr_frame(frame_path: Path) -> list[dict]:
    """Run Tesseract on a single frame and return bounding-box detections."""
    img = cv2.imread(str(frame_path))
    if img is None:
        return []

    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    enhanced = cv2.convertScaleAbs(gray, alpha=1.5, beta=0)

    data = pytesseract.image_to_data(
        enhanced,
        output_type=pytesseract.Output.DICT,
        config="--psm 11",
    )

    results: list[dict] = []
    for i, text in enumerate(data["text"]):
        if not text.strip():
            continue
        conf = int(data["conf"][i])
        if conf < OCR_CONFIDENCE_THRESHOLD:
            continue
        results.append({
            "text": text.strip(),
            "x": round(data["left"][i] / w, 3),
            "y": round(data["top"][i] / h, 3),
            "width": round(data["width"][i] / w, 3),
            "height": round(data["height"][i] / h, 3),
            "confidence": conf,
        })
    return results


def _group_overlays(detections: list[dict]) -> list[dict]:
    """
    Merge consecutive detections of the same text at the same position
    into single overlay entries with computed start/end times.
    """
    if not detections:
        return []

    groups: list[dict] = []
    used: set[int] = set()

    for i, det in enumerate(detections):
        if i in used:
            continue

        group: dict = {
            "id": f"ov_{len(groups) + 1}",
            "text": det["text"],
            "x": det["x"],
            "y": det["y"],
            "width": det["width"],
            "height": det["height"],
            "start": det["timestamp"],
            "end": round(det["timestamp"] + FRAME_INTERVAL, 2),
            "style": {"color": "white", "fontSize": 48, "hasBorder": True},
        }

        for j in range(i + 1, len(detections)):
            if j in used:
                continue
            other = detections[j]
            same_text = other["text"] == det["text"]
            same_pos = (
                abs(other["x"] - det["x"]) < POSITION_TOLERANCE
                and abs(other["y"] - det["y"]) < POSITION_TOLERANCE
            )
            consecutive = other["timestamp"] <= group["end"] + FRAME_INTERVAL + 0.1
            if same_text and same_pos and consecutive:
                group["end"] = round(other["timestamp"] + FRAME_INTERVAL, 2)
                used.add(j)

        groups.append(group)
        used.add(i)

    return groups
