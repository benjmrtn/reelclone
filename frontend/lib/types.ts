export type SessionStatus = 'processing' | 'ready' | 'error' | 'rendering'

export type ExtractionStep = 'cuts' | 'ocr' | 'analysis' | 'rendering'

export interface SessionState {
  session_id: string
  status: SessionStatus
  progress: number
  step: ExtractionStep
  error: string | null
}

export interface Cut {
  start: number
  end: number
  type: 'cut' | 'transition'
}

export interface OverlayStyle {
  color: string
  fontSize: number
  hasBorder: boolean
}

export interface TextOverlay {
  id: string
  text: string
  x: number
  y: number
  width: number
  height: number
  start: number
  end: number
  style: OverlayStyle
}

export interface AudioInfo {
  detected: boolean
  path: string | null
  duration: number
}

export interface VisualStyle {
  brightness: string
  saturation: string
  dominant_text_position: string
  content_type: string
  layout: string
}

export interface Template {
  session_id: string
  duration: number
  cuts: Cut[]
  overlays: TextOverlay[]
  audio: AudioInfo
  visual_style: VisualStyle
}

export interface ExtractResponse {
  session_id: string
  status: string
  estimated_seconds: number
}

export interface ComposeResponse {
  session_id: string
  status: string
  estimated_seconds: number
}
