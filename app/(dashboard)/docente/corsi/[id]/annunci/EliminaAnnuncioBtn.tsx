'use client'

import { useState } from 'react'
import { Trash2, Loader2, X, Check } from 'lucide-react'

export default function EliminaAnnuncioBtn({ annuncioId }: { annuncioId: string }) {
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function elimina() {
    setLoading(true)
    const res = await fetch(`/api/annunci/${annuncioId}`, { method: 'DELETE' })
    setLoading(false)
    if (!res.ok) { setError(true); setConfirm(false); return }
    window.location.reload()
  }

  if (!confirm) {
    return (
      <button
        onClick={() => { setError(false); setConfirm(true) }}
        className={`transition p-1 rounded ${error ? 'text-red-400' : 'text-gray-300 hover:text-red-400'}`}
        title={error ? 'Errore eliminazione' : 'Elimina annuncio'}
      >
        <Trash2 size={13} />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-500">Eliminare?</span>
      <button
        onClick={() => setConfirm(false)}
        className="text-gray-400 hover:text-gray-600 p-1 rounded"
      >
        <X size={13} />
      </button>
      <button
        onClick={elimina}
        disabled={loading}
        className="flex items-center gap-0.5 text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded transition disabled:opacity-50"
      >
        {loading ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
        Sì
      </button>
    </div>
  )
}
