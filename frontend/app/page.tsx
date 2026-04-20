'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ApiKeyInput from '@/components/ApiKeyInput'
import VideoUpload from '@/components/VideoUpload'
import { extractTemplate, getStatus } from '@/lib/api'

const STEPS = ['Upload', 'Template', 'Composition', 'Export']

const STEP_LABELS: Record<string, string> = {
  cuts: 'Détection des cuts...',
  ocr: 'Extraction des textes overlay...',
  analysis: 'Analyse IA des frames...',
  rendering: 'Rendu en cours...',
}

export default function HomePage() {
  const router = useRouter()
  const [apiKey, setApiKey] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = apiKey.startsWith('sk-ant-') && videoFile !== null && !loading

  const pollUntilReady = (sessionId: string): Promise<void> =>
    new Promise((resolve, reject) => {
      const TIMEOUT_MS = 12 * 60 * 1000
      const started = Date.now()

      const tick = setInterval(() => {
        setElapsed(Math.floor((Date.now() - started) / 1000))
      }, 1000)

      const interval = setInterval(async () => {
        if (Date.now() - started > TIMEOUT_MS) {
          clearInterval(interval)
          clearInterval(tick)
          reject(new Error("Délai dépassé (12 min). La vidéo est peut-être trop longue ou le serveur est surchargé."))
          return
        }
        try {
          const state = await getStatus(sessionId)
          setProgress(state.progress)
          setStep(state.step)
          if (state.status === 'ready') { clearInterval(interval); clearInterval(tick); resolve() }
          else if (state.status === 'error') {
            clearInterval(interval)
            clearInterval(tick)
            reject(new Error(state.error ?? "Erreur d'extraction"))
          }
        } catch (err) { clearInterval(interval); clearInterval(tick); reject(err) }
      }, 2000)
    })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoFile || !apiKey) return
    setLoading(true)
    setError(null)
    setElapsed(0)
    setProgress(0)
    try {
      const { session_id } = await extractTemplate(videoFile, apiKey)
      sessionStorage.setItem('session_id', session_id)
      sessionStorage.setItem('api_key', apiKey)
      await pollUntilReady(session_id)
      router.push('/review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header / Stepper */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <span className="font-syne font-bold text-xl text-text-primary shrink-0">
            Reel<span className="text-accent">Clone</span>
          </span>
          <div className="flex items-center gap-1 flex-1 overflow-hidden">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1 min-w-0">
                <div className={`flex items-center gap-1.5 text-sm font-medium whitespace-nowrap ${i === 0 ? 'text-accent' : 'text-text-secondary'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${i === 0 ? 'bg-accent text-white' : 'bg-bg-elevated text-text-secondary'}`}>
                    {i + 1}
                  </span>
                  <span className="hidden sm:inline">{s}</span>
                </div>
                {i < STEPS.length - 1 && <div className="w-6 h-px bg-border mx-1 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="mb-8">
            <h1 className="font-syne text-3xl font-bold text-text-primary mb-2">
              Clone un Reel performant
            </h1>
            <p className="text-text-secondary">
              Upload la vidéo source à cloner. L&apos;IA en extrait la structure : cuts, textes, audio.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="bg-bg-surface border border-border rounded-2xl p-6 flex flex-col gap-6">
              <ApiKeyInput value={apiKey} onChange={setApiKey} disabled={loading} />
              <VideoUpload
                onFileSelect={setVideoFile}
                disabled={loading}
                label="Upload la vidéo source à cloner"
              />
            </div>

            {error && (
              <div className="bg-error/10 border border-error/30 rounded-xl p-4 text-error text-sm">
                {error}
              </div>
            )}

            {loading && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary font-mono">
                    {elapsed < 60 && progress === 0
                      ? '⏳ Démarrage du serveur...'
                      : STEP_LABELS[step] ?? 'Traitement en cours...'}
                  </span>
                  <span className="text-accent font-mono font-bold">
                    {progress > 0 ? `${progress}%` : `${elapsed}s`}
                  </span>
                </div>
                <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: progress > 0 ? `${progress}%` : '5%' }}
                  />
                </div>
                {elapsed > 30 && progress === 0 && (
                  <p className="text-xs text-text-secondary">
                    Le serveur Render gratuit se réveille (~60s). C&apos;est normal.
                  </p>
                )}
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
                  Analyse en cours...
                </>
              ) : (
                <>
                  Extraire le template
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
