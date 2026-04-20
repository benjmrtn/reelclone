'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ExportButton from '@/components/ExportButton'

const STEPS = ['Upload', 'Template', 'Composition', 'Export']

export default function ExportPage() {
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    const id = sessionStorage.getItem('session_id')
    if (!id) { router.replace('/'); return }
    setSessionId(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <svg className="animate-spin text-accent" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
    )
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
                <div className={`flex items-center gap-1.5 text-sm font-medium whitespace-nowrap ${i === 3 ? 'text-accent' : 'text-success'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${i === 3 ? 'bg-accent text-white' : 'bg-success/20 text-success'}`}>
                    {i < 3 ? '✓' : i + 1}
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
        <div className="w-full max-w-md text-center">
          {/* Success icon */}
          <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1 className="font-syne text-3xl font-bold text-text-primary mb-2">
            Vidéo prête !
          </h1>
          <p className="text-text-secondary mb-8">
            Ton Reel cloné est prêt à poster. MP4 H.264 · 1080×1920 · 30fps — sans watermark.
          </p>

          <div className="bg-bg-surface border border-border rounded-2xl p-6">
            <ExportButton sessionId={sessionId} />
          </div>

          <p className="text-text-secondary text-xs mt-6">
            Le fichier sera supprimé automatiquement après 1h.
          </p>
        </div>
      </main>
    </div>
  )
}
