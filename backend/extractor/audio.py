import json
import logging
import os
import subprocess
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

FFMPEG_PATH = os.getenv("FFMPEG_PATH", "ffmpeg")
FFPROBE_PATH = os.getenv("FFPROBE_PATH", "ffprobe")


def has_audio(video_path: Path) -> bool:
    """Return True if the video file contains an audio stream."""
    cmd = [
        FFPROBE_PATH,
        "-v", "quiet",
        "-select_streams", "a",
        "-show_entries", "stream=codec_type",
        "-of", "json",
        str(video_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    data = json.loads(result.stdout)
    return len(data.get("streams", [])) > 0


def extract_audio(video_path: Path, output_dir: Path) -> Optional[Path]:
    """
    Extract the audio track from a video to AAC.

    Returns the path to the extracted audio file, or None if no audio stream.
    """
    if not has_audio(video_path):
        logger.info(f"No audio stream in {video_path.name}")
        return None

    audio_path = output_dir / "audio.aac"
    cmd = [
        FFMPEG_PATH,
        "-i", str(video_path),
        "-vn",
        "-acodec", "aac",
        str(audio_path),
        "-y",
    ]
    subprocess.run(cmd, capture_output=True, check=True)
    logger.info(f"Audio extracted to {audio_path}")
    return audio_path
