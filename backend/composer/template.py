from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Cut:
    start: float
    end: float
    type: str = "cut"

    def to_dict(self) -> dict:
        return {"start": self.start, "end": self.end, "type": self.type}

    @classmethod
    def from_dict(cls, data: dict) -> "Cut":
        return cls(start=data["start"], end=data["end"], type=data.get("type", "cut"))


@dataclass
class OverlayStyle:
    color: str = "white"
    fontSize: int = 48
    hasBorder: bool = True

    def to_dict(self) -> dict:
        return {"color": self.color, "fontSize": self.fontSize, "hasBorder": self.hasBorder}

    @classmethod
    def from_dict(cls, data: dict) -> "OverlayStyle":
        return cls(
            color=data.get("color", "white"),
            fontSize=data.get("fontSize", 48),
            hasBorder=data.get("hasBorder", True),
        )


@dataclass
class TextOverlay:
    id: str
    text: str
    x: float
    y: float
    width: float
    height: float
    start: float
    end: float
    style: OverlayStyle = field(default_factory=OverlayStyle)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "text": self.text,
            "x": self.x,
            "y": self.y,
            "width": self.width,
            "height": self.height,
            "start": self.start,
            "end": self.end,
            "style": self.style.to_dict(),
        }

    @classmethod
    def from_dict(cls, data: dict) -> "TextOverlay":
        return cls(
            id=data["id"],
            text=data["text"],
            x=data["x"],
            y=data["y"],
            width=data["width"],
            height=data["height"],
            start=data["start"],
            end=data["end"],
            style=OverlayStyle.from_dict(data.get("style", {})),
        )


@dataclass
class VisualStyle:
    brightness: str = "dark"
    saturation: str = "high"
    dominant_text_position: str = "bottom"
    content_type: str = "teaser"
    layout: str = "center-bottom"

    def to_dict(self) -> dict:
        return {
            "brightness": self.brightness,
            "saturation": self.saturation,
            "dominant_text_position": self.dominant_text_position,
            "content_type": self.content_type,
            "layout": self.layout,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "VisualStyle":
        return cls(
            brightness=data.get("brightness", "dark"),
            saturation=data.get("saturation", "high"),
            dominant_text_position=data.get("dominant_text_position", "bottom"),
            content_type=data.get("content_type", "teaser"),
            layout=data.get("layout", "center-bottom"),
        )


@dataclass
class Template:
    duration: float
    cuts: list[Cut]
    overlays: list[TextOverlay]
    audio_path: Optional[str]
    visual_style: VisualStyle
    source_video_path: str

    def to_json(self) -> dict:
        """Serialize template to a JSON-compatible dict."""
        return {
            "duration": self.duration,
            "cuts": [c.to_dict() for c in self.cuts],
            "overlays": [o.to_dict() for o in self.overlays],
            "audio": {
                "detected": self.audio_path is not None,
                "path": self.audio_path,
                "duration": self.duration,
            },
            "visual_style": self.visual_style.to_dict(),
            "source_video_path": self.source_video_path,
        }

    @classmethod
    def from_json(cls, data: dict) -> "Template":
        """Deserialize a template from a JSON-compatible dict."""
        audio_data = data.get("audio", {})
        audio_path = audio_data.get("path") if audio_data.get("detected") else None

        return cls(
            duration=data["duration"],
            cuts=[Cut.from_dict(c) for c in data.get("cuts", [])],
            overlays=[TextOverlay.from_dict(o) for o in data.get("overlays", [])],
            audio_path=audio_path,
            visual_style=VisualStyle.from_dict(data.get("visual_style", {})),
            source_video_path=data.get("source_video_path", ""),
        )
