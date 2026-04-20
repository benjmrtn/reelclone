import base64
import json
import logging
from pathlib import Path

import anthropic

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-20250514"
MAX_FRAMES = 8

VISUAL_ANALYSIS_PROMPT = """
Tu analyses des frames d'une vidéo TikTok ou Instagram Reel.

Pour chaque frame fournie, identifie :
1. LAYOUT : position dominante du contenu (haut/centre/bas, gauche/droite)
2. TEXT_ZONE : où les textes overlay sont placés (coordonnées relatives 0-1)
3. STYLE : ambiance visuelle (sombre/clair, saturé/désaturé, flou/net)
4. CONTENT_TYPE : type de contenu détecté (teaser, POV, tutorial, lifestyle, etc.)
5. TRANSITIONS : type de transition visible si c'est une frame de coupure

Réponds UNIQUEMENT en JSON valide, sans markdown :
{
  "layout": "center-bottom",
  "text_zones": [{"x": 0.1, "y": 0.75, "w": 0.8, "h": 0.15}],
  "style": {"brightness": "dark", "saturation": "high", "blur": false},
  "content_type": "teaser",
  "transition": null
}
"""


async def analyze_visual_style(frames_dir: Path, api_key: str) -> dict:
    """
    Send key frames to Claude Vision for visual style analysis.

    Falls back to defaults if analysis fails (e.g. no frames, API error).
    """
    frames = sorted(frames_dir.glob("frame_*.jpg"))

    if not frames:
        logger.warning("No frames found for visual analysis, using defaults")
        return _default_style()

    step = max(1, len(frames) // MAX_FRAMES)
    selected = frames[::step][:MAX_FRAMES]

    try:
        client = anthropic.AsyncAnthropic(api_key=api_key)

        content: list[dict] = []
        for frame_path in selected:
            img_data = base64.standard_b64encode(frame_path.read_bytes()).decode()
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",
                    "data": img_data,
                },
            })
        content.append({"type": "text", "text": VISUAL_ANALYSIS_PROMPT})

        message = await client.messages.create(
            model=MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": content}],
        )

        analysis = json.loads(message.content[0].text)

        return {
            "brightness": analysis.get("style", {}).get("brightness", "dark"),
            "saturation": analysis.get("style", {}).get("saturation", "high"),
            "dominant_text_position": _infer_text_position(analysis.get("text_zones", [])),
            "content_type": analysis.get("content_type", "teaser"),
            "layout": analysis.get("layout", "center-bottom"),
        }

    except anthropic.AuthenticationError:
        raise ValueError("Clé API Anthropic invalide. Vérifie ta clé sur console.anthropic.com")
    except Exception as e:
        logger.warning(f"Claude Vision analysis failed ({e}), using defaults")
        return _default_style()


def _infer_text_position(text_zones: list[dict]) -> str:
    """Derive dominant text position (top/center/bottom) from zone y-coordinates."""
    if not text_zones:
        return "bottom"
    avg_y = sum(z.get("y", 0.75) for z in text_zones) / len(text_zones)
    if avg_y < 0.33:
        return "top"
    if avg_y < 0.66:
        return "center"
    return "bottom"


def _default_style() -> dict:
    return {
        "brightness": "dark",
        "saturation": "high",
        "dominant_text_position": "bottom",
        "content_type": "teaser",
        "layout": "center-bottom",
    }
