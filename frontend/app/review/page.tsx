'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getTemplate } from '@/lib/api'
import type { Template } from '@/lib/types'

const STEPS = ['Upload', 'Template', 'Composition', 'Export']

export default function ReviewPage() {
  const router = useRouter()
  const [template, setTemplate] = useState<Template | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionId = sessionStorage.getItem('session_id')
    if (!sessionId) { router.replace('/'); return }

    getTemplate(sessionId)
      .then(setTemplate)
      .catch(() => setError('Impossible de charger le template. Recommence depuis le début.'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleContinue = () => router.push('/compose')

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-error mb-4">{error}</p>
          <button onClick={() => router.push('/')} className="text-accent hover:underline text-sm">
            ← Retour à l&apos;accueil
          </button>
        </div>
      </div>
    )
  }

  if (!template) {
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
                <div className={`flex items-center gap-1.5 text-sm font-medium whitespace-nowrap ${i === 1 ? 'text-accent' : i < 1 ? 'text-success' : 'text-text-secondary'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${i === 1 ? 'bg-accent text-white' : i < 1 ? 'bg-success/20 text-success' : 'bg-bg-elevated text-text-secondary'}`}>
                    {i < 1 ? '✓' : i + 1}
                  </span>
                  <span className="hidden sm:inline">{s}</span>
                </div>
                {i < STEPS.length - 1 && <div className="w-6 h-px bg-border mx-1 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-10">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          <div>
            <h1 className="font-syne text-2xl font-bold text-text-primary mb-1">
              Template extrait
            </h1>
            <p className="text-text-secondary text-sm">
              Revue de la structure détectée. La composition utilisera ces données.
            </p>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Durée" value={`${template.duration.toFixed(1)}s`} />
            <Stat label="Cuts" value={String(template.cuts.length)} />
            <Stat label="Overlays texte" value={String(template.overlays.length)} />
            <Stat label="Audio" value={template.audio.detected ? 'Détecté' : 'Aucun'} />
          </div>

          {/* Visual style */}
          <Section title="Style visuel">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Row label="Luminosité" value={template.visual_style.brightness} />
              <Row label="Saturation" value={template.visual_style.saturation} />
              <Row label="Position texte" value={template.visual_style.dominant_text_position} />
              <Row label="Type de contenu" value={template.visual_style.content_type} />
            </div>
          </Section>

          {/* Cuts */}
          {template.cuts.length > 0 && (
            <Section title={`Cuts détectés (${template.cuts.length})`}>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
                {template.cuts.map((cut, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-text-secondary font-mono">Segment {i + 1}</span>
                    <span className="text-text-primary font-mono">
                      {cut.start.toFixed(2)}s → {cut.end.toFixed(2)}s
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Overlays */}
          {template.overlays.length > 0 ? (
            <Section title={`Textes overlay (${template.overlays.length})`}>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {template.overlays.map((ov) => (
                  <div key={ov.id} className="bg-bg-primary rounded-lg p-3 text-sm">
                    <p className="text-text-primary font-medium mb-1">&ldquo;{ov.text}&rdquo;</p>
                    <p className="text-text-secondary font-mono text-xs">
                      {ov.start.toFixed(2)}s → {ov.end.toFixed(2)}s · pos ({ov.x.toFixed(2)}, {ov.y.toFixed(2)})
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          ) : (
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 text-warning text-sm">
              Aucun texte overlay détecté. La vidéo source n&apos;a peut-être pas de texte burn-in.
            </div>
          )}

          <button
            onClick={handleContinue}
            className="flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl px-6 py-4 transition-colors font-syne text-lg mt-2"
          >
            Continuer vers la composition
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-surface border border-border rounded-xl p-4">
      <p className="text-text-secondary text-xs uppercase tracking-wider font-syne mb-1">{label}</p>
      <p className="text-text-primary font-bold font-mono text-lg">{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-surface border border-border rounded-xl p-5">
      <h2 className="font-syne font-semibold text-text-primary mb-3 text-sm uppercase tracking-wider">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-text-secondary">{label}</span>
      <span className="text-text-primary font-mono capitalize">{value}</span>
    </div>
  )
}
