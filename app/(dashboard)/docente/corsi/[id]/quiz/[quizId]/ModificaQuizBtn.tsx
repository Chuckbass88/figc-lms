'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Loader2, Check } from 'lucide-react'

export default function ModificaQuizBtn({
  quizId,
  initialTitle,
  initialDescription,
  initialPassingScore,
}: {
  quizId: string
  initialTitle: string
  initialDescription: string | null
  initialPassingScore: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription ?? '')
  const [passingScore, setPassingScore] = useState(initialPassingScore)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (!title.trim() || loading) return
    setLoading(true)
    const res = await fetch(`/api/quiz/${quizId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, passing_score: passingScore }),
    })
    setLoading(false)
    if (res.ok) {
      setSaved(true)
      router.refresh()
      setTimeout(() => { setSaved(false); setOpen(false) }, 1200)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
      >
        <Pencil size={14} /> Modifica
      </button>
    )
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 mt-3">
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Titolo *</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Descrizione</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-400"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Soglia superamento (%)</label>
        <input
          type="number"
          min={0}
          max={100}
          value={passingScore}
          onChange={e => setPassingScore(Number(e.target.value))}
          className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={!title.trim() || loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
          style={{ backgroundColor: '#003DA5' }}
        >
          {loading && <Loader2 size={13} className="animate-spin" />}
          {saved && <Check size={13} />}
          {saved ? 'Salvato!' : 'Salva'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-200 hover:bg-gray-300 transition"
        >
          Annulla
        </button>
      </div>
    </div>
  )
}
