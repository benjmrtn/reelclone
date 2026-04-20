'use client'

import { useRef, useState } from 'react'
import type { DragEvent } from 'react'

interface VideoUploadProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
  label?: string
}

const MAX_SIZE_MB = 500
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']

export default function VideoUpload({
  onFileSelect,
  disabled = false,
  label = 'Dépose ta vidéo ici',
}: VideoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [selected, setSelected] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validate = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Format non supporté. Utilise un fichier MP4, MOV ou WebM.'
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `Fichier trop volumineux. Maximum ${MAX_SIZE_MB}MB.`
    }
    return null
  }

  const accept = (file: File) => {
    const err = validate(file)
    if (err) { setError(err); return }
    setError(null)
    setSelected(file)
    onFileSelect(file)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) accept(file)
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) accept(file)
  }

  const reset = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelected(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={!disabled ? onDrop : undefined}
        className={[
          'border-2 border-dashed rounded-xl p-8 text-center transition-all',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          dragging ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50',
          selected ? 'bg-bg-elevated' : 'bg-bg-surface',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          onChange={onInputChange}
          disabled={disabled}
          className="hidden"
        />

        {selected ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-text-primary font-medium text-sm">{selected.name}</p>
            <p className="text-text-secondary text-xs">
              {(selected.size / (1024 * 1024)).toFixed(1)} MB
            </p>
            <button
              type="button"
              onClick={reset}
              className="text-xs text-text-secondary hover:text-error transition-colors mt-1"
            >
              Changer de fichier
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <p className="text-text-primary font-medium">{label}</p>
              <p className="text-text-secondary text-sm mt-1">MP4, MOV, WebM — max 500MB</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-error text-sm flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}
