'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

export default function EliminaQuizBtn({ quizId, courseId }: { quizId: string; courseId: string }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const res = await fetch(`/api/quiz/${quizId}`, { method: 'DELETE' })
    setLoading(false)
    if (res.ok) {
      router.push(`/docente/corsi/${courseId}/quiz`)
      router.refresh()
    }
  }

  if (step === 0) {
    return (
      <button
        onClick={() => setStep(1)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition"
      >
        <Trash2 size={14} /> Elimina quiz
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-gray-600">Elimina quiz e tutti i risultati?</span>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition"
      >
        {loading && <Loader2 size={13} className="animate-spin" />}
        Sì, elimina
      </button>
      <button
        onClick={() => setStep(0)}
        className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
      >
        Annulla
      </button>
    </div>
  )
}
