'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Loader2, Check, X } from 'lucide-react'

interface Props {
  taskId: string
  initialTitle: string
  initialDescription: string | null
  initialDueDate: string | null
}

export default function ModificaTaskBtn({ taskId, initialTitle, initialDescription, initialDueDate }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription ?? '')
  const [dueDate, setDueDate] = useState(initialDueDate ?? '')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function salva() {
    if (!title.trim()) return
    setLoading(true)
    await fetch(`/api/task/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        dueDate: dueDate || null,
      }),
    })
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-gray-500 bg-gray-100 hover:bg-gray-200 transition"
      >
        <Pencil size={12} /> Modifica
      </button>
    )
  }

  return (
    <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
          Titolo <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Descrizione</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Scadenza</label>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          onClick={salva}
          disabled={!title.trim() || loading}
          className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
          style={{ backgroundColor: '#003DA5' }}
        >
          {loading && <Loader2 size={11} className="animate-spin" />}
          <Check size={11} /> Salva modifiche
        </button>
      </div>
    </div>
  )
}
