import asyncio
import json
import logging
import os
import shutil
import time
import uuid
from pathlib import Path

import aiofiles
from dotenv import load_dotenv
from fastapi import BackgroundTasks, Body, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from composer.renderer import render_video
from composer.template import Template, VisualStyle
from extractor.analyzer import analyze_visual_style
from extractor.audio import extract_audio
from extractor.cuts import detect_cuts, get_video_duration
from extractor.ocr import extract_overlays
from utils.ffmpeg_check import check_dependencies
from utils.session import SessionManager
from utils.validators import validate_video

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="ReelClone API", version="1.0.0")

_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

session_manager = SessionManager()

TEMP_DIR = Path(os.getenv("TEMP_DIR", "/tmp/reelclone"))
MAX_SIZE_MB = int(os.getenv("MAX_VIDEO_SIZE_MB", "500"))


@app.on_event("startup")
async def startup_event() -> None:
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    check_dependencies()
    logger.info("ReelClone API ready")


# ── Extract ──────────────────────────────────────────────────────────────────

@app.post("/api/extract")
async def extract(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    api_key: str = Form(...),
) -> dict:
    """Upload source video and kick off async extraction pipeline."""
    validate_video(video, MAX_SIZE_MB)

    session_id = str(uuid.uuid4())
    session_dir = TEMP_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    content = await video.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        shutil.rmtree(session_dir)
        raise HTTPException(
            status_code=400,
            detail=f"Fichier trop volumineux. Maximum {MAX_SIZE_MB}MB.",
        )

    source_path = session_dir / "source.mp4"
    async with aiofiles.open(source_path, "wb") as f:
        await f.write(content)

    session_manager.create(session_id)
    background_tasks.add_task(_run_extraction, session_id, source_path, api_key)

    return {"session_id": session_id, "status": "processing", "estimated_seconds": 45}


async def _run_extraction(session_id: str, source_path: Path, api_key: str) -> None:
    session_dir = source_path.parent
    try:
        session_manager.update(session_id, status="processing", progress=5, step="cuts")
        cuts = await asyncio.to_thread(detect_cuts, source_path)

        session_manager.update(session_id, progress=30, step="ocr")
        frames_dir = session_dir / "frames"
        frames_dir.mkdir(exist_ok=True)
        overlays = await asyncio.to_thread(extract_overlays, source_path, frames_dir)

        session_manager.update(session_id, progress=55, step="audio")
        audio_path = await asyncio.to_thread(extract_audio, source_path, session_dir)

        session_manager.update(session_id, progress=75, step="analysis")
        visual_style_data = await analyze_visual_style(frames_dir, api_key)

        duration = await asyncio.to_thread(get_video_duration, source_path)

        template = Template(
            duration=duration,
            cuts=[],
            overlays=overlays,
            audio_path=str(audio_path) if audio_path else None,
            visual_style=VisualStyle.from_dict(visual_style_data),
            source_video_path=str(source_path),
        )
        # Re-attach cuts as plain dicts (already serializable)
        template_dict = template.to_json()
        template_dict["cuts"] = cuts

        (session_dir / "template.json").write_text(json.dumps(template_dict, indent=2))
        session_manager.update(session_id, status="ready", progress=100, step="analysis")
        logger.info(f"Extraction complete — session {session_id}")

        asyncio.ensure_future(
            session_manager.schedule_cleanup(session_id, session_dir)
        )

    except ValueError as e:
        # API key / validation errors — surface to UI
        session_manager.update(session_id, status="error", error=str(e))
    except Exception as e:
        logger.error(f"Extraction failed — session {session_id}: {e}")
        session_manager.update(session_id, status="error", error="Erreur de rendu. Vérifie que ta vidéo n'est pas corrompue.")


# ── Status ────────────────────────────────────────────────────────────────────

@app.get("/api/status/{session_id}")
async def get_status(session_id: str) -> dict:
    """Poll extraction or rendering progress."""
    state = session_manager.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session introuvable")
    return state


# ── Template ─────────────────────────────────────────────────────────────────

@app.get("/api/template/{session_id}")
async def get_template(session_id: str) -> dict:
    """Return the extracted template JSON for a session."""
    template_path = TEMP_DIR / session_id / "template.json"
    if not template_path.exists():
        raise HTTPException(status_code=404, detail="Template non disponible")
    data: dict = json.loads(template_path.read_text())
    data["session_id"] = session_id
    return data


@app.put("/api/template/{session_id}")
async def update_template(session_id: str, template_data: dict = Body(...)) -> dict:
    """Persist manual edits to the template."""
    session_dir = TEMP_DIR / session_id
    if not session_dir.exists():
        raise HTTPException(status_code=404, detail="Session introuvable")
    (session_dir / "template.json").write_text(json.dumps(template_data, indent=2))
    return {"status": "updated"}


# ── Compose ───────────────────────────────────────────────────────────────────

@app.post("/api/compose/{session_id}")
async def compose(
    session_id: str,
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    keep_audio: bool = Form(True),
    api_key: str = Form(...),
) -> dict:
    """Upload model video and kick off async render pipeline."""
    session_dir = TEMP_DIR / session_id
    if not session_dir.exists():
        raise HTTPException(status_code=404, detail="Session introuvable")

    validate_video(video, MAX_SIZE_MB)

    model_content = await video.read()
    if len(model_content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"Fichier trop volumineux. Maximum {MAX_SIZE_MB}MB.",
        )

    model_path = session_dir / "model_video.mp4"
    async with aiofiles.open(model_path, "wb") as f:
        await f.write(model_content)

    session_manager.update(session_id, status="rendering", progress=0, step="rendering")
    background_tasks.add_task(_run_compose, session_id, model_path, keep_audio)

    return {"session_id": session_id, "status": "rendering", "estimated_seconds": 30}


async def _run_compose(session_id: str, model_path: Path, keep_audio: bool) -> None:
    session_dir = model_path.parent
    try:
        template_path = session_dir / "template.json"
        if not template_path.exists():
            raise FileNotFoundError("Template introuvable")

        template = Template.from_json(json.loads(template_path.read_text()))
        output_path = session_dir / "output.mp4"

        await asyncio.to_thread(
            render_video,
            template,
            model_path,
            output_path,
            keep_audio,
            lambda p: session_manager.update(session_id, progress=p),
        )

        session_manager.update(session_id, status="ready", progress=100, step="rendering")
        logger.info(f"Render complete — session {session_id}")

    except Exception as e:
        logger.error(f"Render failed — session {session_id}: {e}")
        session_manager.update(session_id, status="error", error="Erreur de rendu. Vérifie que ta vidéo n'est pas corrompue.")


# ── Export ────────────────────────────────────────────────────────────────────

@app.get("/api/export/{session_id}")
async def export_video(session_id: str) -> FileResponse:
    """Stream the rendered MP4 for download."""
    output_path = TEMP_DIR / session_id / "output.mp4"
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Export non disponible")
    return FileResponse(
        path=str(output_path),
        media_type="video/mp4",
        filename=f"reelclone_{int(time.time())}.mp4",
    )


# ── Session cleanup ───────────────────────────────────────────────────────────

@app.delete("/api/session/{session_id}")
async def delete_session(session_id: str) -> dict:
    """Immediately delete all session files and in-memory state."""
    session_dir = TEMP_DIR / session_id
    if session_dir.exists():
        shutil.rmtree(session_dir)
    session_manager.remove(session_id)
    return {"status": "deleted"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=True)
