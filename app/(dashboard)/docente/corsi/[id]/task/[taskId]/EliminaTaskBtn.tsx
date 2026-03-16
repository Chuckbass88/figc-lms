'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

export default function EliminaTaskBtn({ taskId, courseId, redirectTo }: { taskId: string; courseId: string; redirectTo?: string }) {
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function elimina() {
    setLoading(true)
    await fetch(`/api/task/${taskId}`, { method: 'DELETE' })
    setLoading(false)
    router.push(redirectTo ?? `/docente/corsi/${courseId}/task`)
    router.refresh()
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 transition"
      >
        <Trash2 size={12} /> Elimina task
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
      <span className="text-xs text-red-700 font-medium">Eliminare il task e tutte le consegne?</span>
      <button
        onClick={() => setConfirm(false)}
        className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
      >
        Annulla
      </button>
      <button
        onClick={elimina}
        disabled={loading}
        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition disabled:opacity-50"
      >
        {loading && <Loader2 size={11} className="animate-spin" />}
        Elimina
      </button>
    </div>
  )
}
