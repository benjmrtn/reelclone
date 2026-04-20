'use client'

import { useState } from 'react'
import { deleteSession, getExportUrl } from '@/lib/api'

interface ExportButtonProps {
  sessionId: string
  disabled?: boolean
}

export default function ExportButton({ sessionId, disabled }: ExportButtonProps) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const url = getExportUrl(sessionId)
      const a = document.createElement('a')
      a.href = url
      a.download = `reelclone_${Date.now()}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } finally {
      setDownloading(false)
    }
  }

  const handleReset = async () => {
    await deleteSession(sessionId)
    sessionStorage.clear()
    window.location.href = '/'
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleDownload}
        disabled={disabled || downloading}
        className="flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-6 py-4 transition-colors font-syne text-lg"
      >
        {downloading ? (
          <>
            <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Téléchargement...
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Télécharger MP4
          </>
        )}
      </button>
      <button
        onClick={handleReset}
        className="text-text-secondary hover:text-error text-sm transition-colors text-center"
      >
        Supprimer et recommencer
      </button>
    </div>
  )
}
