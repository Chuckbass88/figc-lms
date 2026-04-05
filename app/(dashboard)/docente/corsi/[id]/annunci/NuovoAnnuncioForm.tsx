'use client'

import { useState, useRef } from 'react'
import { Megaphone, Loader2, Check, X, Paperclip, Upload, FileText } from 'lucide-react'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function NuovoAnnuncioForm({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setTitle(''); setContent(''); setFile(null); setError(null); setOpen(false)
  }

  async function pubblica() {
    if (!title.trim() || !content.trim()) return
    setLoading(true)
    setError(null)

    const fd = new FormData()
    fd.append('courseId', courseId)
    fd.append('title', title)
    fd.append('content', content)
    if (file) fd.append('file', file)

    const res = await fetch('/api/annunci/create', { method: 'POST', body: fd })
    setLoading(false)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? 'Errore durante la pubblicazione')
      return
    }
    reset()
    window.location.reload()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white font-semibold hover:opacity-90 transition"
        style={{ backgroundColor: '#1565C0' }}
      >
        <Megaphone size={12} /> Nuovo annuncio
      </button>
    )
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Megaphone size={14} className="text-blue-600" />
        <span className="text-sm font-semibold text-blue-900">Nuovo annuncio</span>
        <button onClick={reset} className="ml-auto text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
          Titolo <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
          placeholder="Es. Aggiornamento materiali lezione 3"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
          Contenuto <span className="text-red-400">*</span>
        </label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={4}
          placeholder="Scrivi il testo dell'annuncio..."
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Allegato opzionale */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
          Allegato <span className="text-gray-400 font-normal">(opzionale)</span>
        </label>
        {file ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-white">
            <FileText size={14} className="text-red-500 flex-shrink-0" />
            <span className="text-xs text-gray-700 truncate flex-1">{file.name}</span>
            <span className="text-xs text-gray-400 flex-shrink-0">{formatSize(file.size)}</span>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="text-gray-400 hover:text-red-500 transition flex-shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDragEnter={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault()
              const f = e.dataTransfer.files?.[0]
              if (f) setFile(f)
            }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-gray-300 bg-white cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition"
          >
            <Paperclip size={13} className="text-gray-400" />
            <span className="text-xs text-gray-400">Clicca o trascina un file (PDF, DOCX, …)</span>
            <Upload size={12} className="text-gray-300 ml-auto" />
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={reset}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition"
        >
          <X size={12} /> Annulla
        </button>
        <button
          onClick={pubblica}
          disabled={!title.trim() || !content.trim() || loading}
          className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
          style={{ backgroundColor: '#1565C0' }}
        >
          {loading && <Loader2 size={11} className="animate-spin" />}
          <Check size={11} /> Pubblica
        </button>
      </div>
    </div>
  )
}
