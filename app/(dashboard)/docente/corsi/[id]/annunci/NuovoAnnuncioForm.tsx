'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Megaphone, Loader2, Check, X, ChevronDown } from 'lucide-react'

export default function NuovoAnnuncioForm({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function pubblica() {
    if (!title.trim() || !content.trim()) return
    setLoading(true)
    await fetch('/api/annunci/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, title, content }),
    })
    setLoading(false)
    setTitle('')
    setContent('')
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white font-semibold hover:opacity-90 transition"
        style={{ backgroundColor: '#003DA5' }}
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
        <button onClick={() => setOpen(false)} className="ml-auto text-gray-400 hover:text-gray-600">
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
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => setOpen(false)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition"
        >
          <X size={12} /> Annulla
        </button>
        <button
          onClick={pubblica}
          disabled={!title.trim() || !content.trim() || loading}
          className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
          style={{ backgroundColor: '#003DA5' }}
        >
          {loading && <Loader2 size={11} className="animate-spin" />}
          <Check size={11} /> Pubblica
        </button>
      </div>
    </div>
  )
}
