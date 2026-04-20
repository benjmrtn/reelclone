'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import VideoUpload from '@/components/VideoUpload'
import { composeVideo, getStatus } from '@/lib/api'

const STEPS = ['Upload', 'Template', 'Composition', 'Export']

export default function ComposePage() {
  const router = useRouter()
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [keepAudio, setKeepAudio] = useState(true)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = modelFile !== null && !loading

  const pollUntilReady = (sessionId: string): Promise<void> =>
    new Promise((resolve, reject) => {
      const TIMEOUT_MS = 5 * 60 * 1000
      const started = Date.now()

      const interval = setInterval(async () => {
        if (Date.now() - started > TIMEOUT_MS) {
          clearInterval(interval)
          reject(new Error("Délai dépassé. Le rendu a pris trop de temps."))
          return
        }
        try {
          const state = await getStatus(sessionId)
          setProgress(state.progress)
          if (state.status === 'ready') { clearInterval(interval); resolve() }
          else if (state.status === 'error') {
            clearInterval(interval)
            reject(new Error(state.error ?? 'Erreur de rendu'))
          }
        } catch (err) { clearInterval(interval); reject(err) }
      }, 2000)
    })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modelFile) return

    const sessionId = sessionStorage.getItem('session_id')
    const apiKey = sessionStorage.getItem('api_key')
    if (!sessionId || !apiKey) { router.replace('/'); return }

    setLoading(true)
    setError(null)
    try {
      await composeVideo(sessionId, modelFile, keepAudio, apiKey)
      await pollUntilReady(sessionId)
      router.push('/export')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <span className="font-syne font-bold text-xl text-text-primary shrink-0">
            Reel<span className="text-accent">Clone</span>
          </span>
          <div className="flex items-center gap-1 flex-1 overflow-hidden">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1 min-w-0">
                <div className={`flex items-center gap-1.5 text-sm font-medium whitespace-nowrap ${i === 2 ? 'text-accent' : i < 2 ? 'text-success' : 'text-text-secondary'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${i === 2 ? 'bg-accent text-white' : i < 2 ? 'bg-success/20 text-success' : 'bg-bg-elevated text-text-secondary'}`}>
                    {i < 2 ? '✓' : i + 1}
                  </span>
                  <span className="hidden sm:inline">{s}</span>
                </div>
                {i < STEPS.length - 1 && <div className="w-6 h-px bg-border mx-1 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="mb-8">
            <h1 className="font-syne text-2xl font-bold text-text-primary mb-1">
              Upload ta vidéo modèle
            </h1>
            <p className="text-text-secondary text-sm">
              La vidéo sera croppée en 9:16 et le template sera appliqué automatiquement.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="bg-bg-surface border border-border rounded-2xl p-6 flex flex-col gap-5">
              <VideoUpload
                onFileSelect={setModelFile}
                disabled={loading}
                label="Upload la vidéo de ton modèle"
              />

              {/* Audio option */}
              <label className="flex items-center justify-between cursor-pointer group">
                <div>
                  <p className="text-text-primary font-medium text-sm">Garder l&apos;audio original</p>
                  <p className="text-text-secondary text-xs mt-0.5">Utilise la piste audio de la vidéo source</p>
                </div>
                <div
                  onClick={() => !loading && setKeepAudio((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${keepAudio ? 'bg-accent' : 'bg-bg-elevated border border-border'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${keepAudio ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>
            </div>

            {error && (
              <div className="bg-error/10 border border-error/30 rounded-xl p-4 text-error text-sm">
                {error}
              </div>
            )}

            {loading && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary font-mono">Rendu en cours...</span>
                  <span className="text-accent font-mono font-bold">{progress}%</span>
                </div>
                <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-4 transition-colors font-syne text-lg"
            >
              {loading ? (
                <>
                  <svg className="animate-spin shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Rendu en cours...
                </>
              ) : (
                <>
                  Lancer le rendu
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              disabled={loading}
              className="text-text-secondary hover:text-text-primary text-sm transition-colors text-center disabled:opacity-40"
            >
              ← Retour au template
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
