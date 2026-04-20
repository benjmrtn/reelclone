import logging
import os
import subprocess
from pathlib import Path
from typing import Callable, Optional

from composer.overlay import build_drawtext_filter
from composer.template import Template

logger = logging.getLogger(__name__)

FFMPEG_PATH = os.getenv("FFMPEG_PATH", "ffmpeg")
OUTPUT_WIDTH = 1080
OUTPUT_HEIGHT = 1920
OUTPUT_FPS = 30


def render_video(
    template: Template,
    model_video_path: Path,
    output_path: Path,
    keep_audio: bool,
    progress_callback: Optional[Callable[[int], None]] = None,
) -> None:
    """
    Apply a template to a model video and render the final MP4.

    Pipeline: crop 9:16 → apply overlays → merge original audio (optional)
    Output: H.264 MP4, 1080x1920, 30fps.
    """
    if progress_callback:
        progress_callback(10)

    cropped_path = output_path.parent / "model_cropped.mp4"
    _crop_to_9_16(model_video_path, cropped_path)

    if progress_callback:
        progress_callback(50)

    overlay_filter = build_drawtext_filter(template.overlays, OUTPUT_WIDTH, OUTPUT_HEIGHT)
    audio_path = Path(template.audio_path) if template.audio_path else None

    if keep_audio and audio_path and audio_path.exists():
        _render_with_audio(cropped_path, audio_path, overlay_filter, output_path, template.duration)
    else:
        _render_video_only(cropped_path, overlay_filter, output_path, template.duration)

    if progress_callback:
        progress_callback(95)

    logger.info(f"Render complete: {output_path}")


def _crop_to_9_16(input_path: Path, output_path: Path) -> None:
    """Crop and scale input video to 1080x1920 (9:16), center-cropped."""
    cmd = [
        FFMPEG_PATH,
        "-i", str(input_path),
        "-vf", "crop=ih*9/16:ih,scale=1080:1920",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-an",
        str(output_path),
        "-y",
    ]
    subprocess.run(cmd, capture_output=True, check=True)


def _render_with_audio(
    video_path: Path,
    audio_path: Path,
    overlay_filter: str,
    output_path: Path,
    duration: float,
) -> None:
    """Render video with overlay text and original audio track."""
    vf = f"fps={OUTPUT_FPS}"
    if overlay_filter:
        vf += f",{overlay_filter}"

    cmd = [
        FFMPEG_PATH,
        "-i", str(video_path),
        "-i", str(audio_path),
        "-vf", vf,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac",
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-t", str(duration),
        "-shortest",
        str(output_path),
        "-y",
    ]
    subprocess.run(cmd, capture_output=True, check=True)


def _render_video_only(
    video_path: Path,
    overlay_filter: str,
    output_path: Path,
    duration: float,
) -> None:
    """Render video with overlay text, no audio."""
    vf = f"fps={OUTPUT_FPS}"
    if overlay_filter:
        vf += f",{overlay_filter}"

    cmd = [
        FFMPEG_PATH,
        "-i", str(video_path),
        "-vf", vf,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-an",
        "-t", str(duration),
        str(output_path),
        "-y",
    ]
    subprocess.run(cmd, capture_output=True, check=True)
