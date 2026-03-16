'use client'

import { useState } from 'react'
import { StickyNote, Loader2, Check } from 'lucide-react'

interface Props {
  courseId: string
  studentId: string
  initialContent: string | null
}

export default function NotaPrivataEditor({ courseId, studentId, initialContent }: Props) {
  const [open, setOpen] = useState(!!initialContent)
  const [content, setContent] = useState(initialContent ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function salva() {
    setSaving(true)
    await fetch('/api/note', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, studentId, content }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition px-2 py-1"
      >
        <StickyNote size={12} /> Aggiungi nota privata
      </button>
    )
  }

  return (
    <div className="px-5 py-3 bg-amber-50 border-t border-amber-100">
      <div className="flex items-center gap-1.5 mb-2">
        <StickyNote size={12} className="text-amber-500" />
        <span className="text-xs font-semibold text-amber-700">Nota privata</span>
        <span className="text-xs text-amber-500">(visibile solo a te)</span>
      </div>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={3}
        autoFocus
        placeholder="Scrivi una nota su questo corsista per questo corso..."
        className="w-full px-3 py-2 rounded-lg border border-amber-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none bg-white"
      />
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={salva}
          disabled={saving}
          className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 transition disabled:opacity-50"
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : saved ? <Check size={11} /> : null}
          {saved ? 'Salvato' : 'Salva'}
        </button>
        {!initialContent && !content && (
          <button
            onClick={() => setOpen(false)}
            className="text-xs text-gray-400 hover:text-gray-600 transition"
          >
            Annulla
          </button>
        )}
      </div>
    </div>
  )
}
