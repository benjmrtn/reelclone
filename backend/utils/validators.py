import os
from fastapi import UploadFile, HTTPException

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv"}
ALLOWED_CONTENT_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-matroska",
}


def validate_video(video: UploadFile, max_size_mb: int) -> None:
    """Validate uploaded video by extension and content type."""
    filename = video.filename or ""
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Format non supporté. Utilise un fichier MP4, MOV ou WebM.",
        )

    content_type = video.content_type or ""
    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Format non supporté. Utilise un fichier MP4, MOV ou WebM.",
        )
