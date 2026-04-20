import type {
  ComposeResponse,
  ExtractResponse,
  SessionState,
  Template,
} from './types'

const API_BASE = '/api'

export async function extractTemplate(
  video: File,
  apiKey: string,
): Promise<ExtractResponse> {
  const body = new FormData()
  body.append('video', video)
  body.append('api_key', apiKey)

  const res = await fetch(`${API_BASE}/extract`, { method: 'POST', body })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erreur inconnue' }))
    throw new Error(err.detail ?? "Erreur lors de l'extraction")
  }
  return res.json()
}

export async function getStatus(sessionId: string): Promise<SessionState> {
  const res = await fetch(`${API_BASE}/status/${sessionId}`)
  if (!res.ok) throw new Error('Session introuvable')
  return res.json()
}

export async function getTemplate(sessionId: string): Promise<Template> {
  const res = await fetch(`${API_BASE}/template/${sessionId}`)
  if (!res.ok) throw new Error('Template indisponible')
  return res.json()
}

export async function updateTemplate(
  sessionId: string,
  template: Template,
): Promise<void> {
  const res = await fetch(`${API_BASE}/template/${sessionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  })
  if (!res.ok) throw new Error('Erreur lors de la mise à jour du template')
}

export async function composeVideo(
  sessionId: string,
  video: File,
  keepAudio: boolean,
  apiKey: string,
): Promise<ComposeResponse> {
  const body = new FormData()
  body.append('video', video)
  body.append('keep_audio', String(keepAudio))
  body.append('api_key', apiKey)

  const res = await fetch(`${API_BASE}/compose/${sessionId}`, {
    method: 'POST',
    body,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erreur inconnue' }))
    throw new Error(err.detail ?? 'Erreur lors de la composition')
  }
  return res.json()
}

export function getExportUrl(sessionId: string): string {
  return `${API_BASE}/export/${sessionId}`
}

export async function deleteSession(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/session/${sessionId}`, { method: 'DELETE' })
}
