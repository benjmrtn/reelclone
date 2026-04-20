from composer.template import TextOverlay

OUTPUT_WIDTH = 1080
OUTPUT_HEIGHT = 1920


def build_drawtext_filter(
    overlays: list[TextOverlay],
    video_width: int = OUTPUT_WIDTH,
    video_height: int = OUTPUT_HEIGHT,
) -> str:
    """
    Build a comma-joined FFmpeg drawtext filter string for all overlays.

    Returns an empty string if there are no overlays.
    """
    if not overlays:
        return ""

    filters: list[str] = []
    for overlay in overlays:
        x_px = int(overlay.x * video_width)
        y_px = int(overlay.y * video_height)

        # Escape single quotes and colons for FFmpeg filter syntax
        text = overlay.text.replace("\\", "\\\\").replace("'", "\\'").replace(":", "\\:")

        border = ":borderw=3:bordercolor=black" if overlay.style.hasBorder else ""

        filters.append(
            f"drawtext=text='{text}'"
            f":fontsize={overlay.style.fontSize}"
            f":fontcolor={overlay.style.color}"
            f"{border}"
            f":x={x_px}"
            f":y={y_px}"
            f":enable='between(t,{overlay.start},{overlay.end})'"
        )

    return ",".join(filters)
