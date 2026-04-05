'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star, Loader2, Check } from 'lucide-react'

interface Props {
  submissionId: string
  studentId: string
  taskTitle: string
  initialGrade?: string | null
  initialFeedback?: string | null
}

export default function ValutaBtn({ submissionId, studentId, taskTitle, initialGrade, initialFeedback }: Props) {
  const [open, setOpen] = useState(false)
  const [grade, setGrade] = useState(initialGrade ?? '')
  const [feedback, setFeedback] = useState(initialFeedback ?? '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  async function salva() {
    setLoading(true)
    await fetch('/api/task/valuta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId, grade, feedback, studentId, taskTitle }),
    })
    setLoading(false)
    setOpen(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  if (saved) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-lg">
        <Check size={11} /> Salvato
      </span>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition ${
          initialGrade
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        }`}
      >
        <Star size={11} />
        {initialGrade ? `Voto: ${initialGrade}` : 'Valuta'}
      </button>
    )
  }

  return (
    <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
      <div className="flex gap-2">
        <div className="w-28">
          <label className="text-xs font-semibold text-gray-500 block mb-1">Voto / giudizio</label>
          <input
            type="text"
            value={grade}
            onChange={e => setGrade(e.target.value)}
            placeholder="Es. 8/10, Ottimo"
            autoFocus
            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs font-semibold text-gray-500 block mb-1">Feedback</label>
          <input
            type="text"
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Commento per il corsista..."
            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
        >
          Annulla
        </button>
        <button
          onClick={salva}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white font-semibold disabled:opacity-50 hover:opacity-90 transition"
          style={{ backgroundColor: '#1565C0' }}
        >
          {loading && <Loader2 size={11} className="animate-spin" />}
          <Check size={11} /> Salva valutazione
        </button>
      </div>
    </div>
  )
}
