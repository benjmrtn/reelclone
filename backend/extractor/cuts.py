import json
import logging
import os
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)

FFMPEG_PATH = os.getenv("FFMPEG_PATH", "ffmpeg")
FFPROBE_PATH = os.getenv("FFPROBE_PATH", "ffprobe")
SCENE_THRESHOLD = 0.3


def get_video_duration(video_path: Path) -> float:
    """Return video duration in seconds via ffprobe."""
    cmd = [
        FFPROBE_PATH,
        "-v", "quiet",
        "-show_entries", "format=duration",
        "-of", "json",
        str(video_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    data = json.loads(result.stdout)
    return float(data["format"]["duration"])


def detect_cuts(video_path: Path, threshold: float = SCENE_THRESHOLD) -> list[dict]:
    """
    Detect scene cuts using FFmpeg scene filter.

    Returns a list of cut segments: [{start, end, type}]
    """
    duration = get_video_duration(video_path)

    cmd = [
        FFMPEG_PATH,
        "-i", str(video_path),
        "-filter:v", f"select='gt(scene,{threshold})',showinfo",
        "-f", "null", "-",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    scene_timestamps = _parse_showinfo(result.stderr)

    if not scene_timestamps:
        logger.info(f"No scene cuts detected above threshold {threshold}, returning single segment")
        return [{"start": 0.0, "end": round(duration, 3), "type": "cut"}]

    cuts: list[dict] = []
    prev = 0.0
    for ts in sorted(scene_timestamps):
        cuts.append({"start": round(prev, 3), "end": round(ts, 3), "type": "cut"})
        prev = ts
    cuts.append({"start": round(prev, 3), "end": round(duration, 3), "type": "cut"})

    logger.info(f"Detected {len(cuts)} cuts in {video_path.name}")
    return cuts


def _parse_showinfo(stderr: str) -> list[float]:
    """Extract pts_time values from FFmpeg showinfo filter output."""
    timestamps: list[float] = []
    for line in stderr.splitlines():
        if "showinfo" not in line or "pts_time:" not in line:
            continue
        for part in line.split():
            if part.startswith("pts_time:"):
                try:
                    timestamps.append(float(part.split(":")[1]))
                except (IndexError, ValueError):
                    pass
    return timestamps
