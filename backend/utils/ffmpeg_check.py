import os
import shutil
import subprocess
import logging

logger = logging.getLogger(__name__)


def check_dependencies() -> None:
    """Verify FFmpeg, FFprobe, and Tesseract are installed at startup."""
    ffmpeg = os.getenv("FFMPEG_PATH", "ffmpeg")
    ffprobe = os.getenv("FFPROBE_PATH", "ffprobe")
    tesseract = os.getenv("TESSERACT_PATH", "tesseract")

    _check_tool(ffmpeg, "ffmpeg", "brew install ffmpeg (Mac) ou apt install ffmpeg (Linux)")
    _check_tool(ffprobe, "ffprobe", "brew install ffmpeg (Mac) ou apt install ffmpeg (Linux)")
    _check_tool(
        tesseract,
        "tesseract",
        "brew install tesseract (Mac) ou apt install tesseract-ocr (Linux)",
    )


def _check_tool(path: str, name: str, install_hint: str) -> None:
    """Resolve and verify a CLI tool exists and responds to --version."""
    resolved = shutil.which(path) or shutil.which(name)
    if not resolved:
        raise RuntimeError(
            f"{name} n'est pas installé. Installe-le via : {install_hint}"
        )
    try:
        subprocess.run([resolved, "-version"], capture_output=True, check=True, timeout=5)
        logger.info(f"{name} detected at {resolved}")
    except subprocess.CalledProcessError:
        logger.warning(f"{name} found at {resolved} but version check failed")
    except subprocess.TimeoutExpired:
        logger.warning(f"{name} version check timed out")
