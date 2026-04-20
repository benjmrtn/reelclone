import asyncio
import shutil
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class SessionState:
    session_id: str
    status: str = "processing"
    progress: int = 0
    step: str = "cuts"
    error: Optional[str] = None


class SessionManager:
    """In-memory session state tracker. No persistence — filesystem is source of truth."""

    def __init__(self) -> None:
        self._sessions: dict[str, SessionState] = {}

    def create(self, session_id: str) -> SessionState:
        """Create a new session and return its initial state."""
        state = SessionState(session_id=session_id)
        self._sessions[session_id] = state
        return state

    def get(self, session_id: str) -> Optional[dict]:
        """Return session state as a dict, or None if not found."""
        state = self._sessions.get(session_id)
        if not state:
            return None
        return {
            "session_id": state.session_id,
            "status": state.status,
            "progress": state.progress,
            "step": state.step,
            "error": state.error,
        }

    def update(self, session_id: str, **kwargs: object) -> None:
        """Patch session state fields."""
        state = self._sessions.get(session_id)
        if state:
            for key, value in kwargs.items():
                setattr(state, key, value)

    def remove(self, session_id: str) -> None:
        """Remove a session from memory."""
        self._sessions.pop(session_id, None)

    async def schedule_cleanup(
        self, session_id: str, session_dir: Path, delay_seconds: int = 3600
    ) -> None:
        """Delete session files after delay_seconds (default 1h)."""
        await asyncio.sleep(delay_seconds)
        if session_dir.exists():
            shutil.rmtree(session_dir)
            logger.info(f"Auto-cleaned session {session_id}")
        self.remove(session_id)
