'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'

export default function EliminaValutazioneBtn({
  id, tipo, onDeleted,
}: { id: string; tipo: 'pratica' | 'aperta'; onDeleted: () => void }) {
  const [loading, setLoading] = useState(false)

  async function elimina() {
    if (!confirm('Eliminare questa valutazione?')) return
    setLoading(true)
    const url = tipo === 'pratica'
      ? `/api/valutazioni/pratica/${id}`
      : `/api/valutazioni/aperta/${id}`
    await fetch(url, { method: 'DELETE' })
    setLoading(false)
    onDeleted()
  }

  return (
    <button
      onClick={elimina}
      disabled={loading}
      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-50"
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
    </button>
  )
}
