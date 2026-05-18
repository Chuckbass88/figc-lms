'use client'

import { useState } from 'react'
import { FileText, Loader2, AlertCircle } from 'lucide-react'

interface Props {
  submissionId: string
  fileName: string | null
  fileSizeLabel?: string | null
}

export default function ScaricaConsegnaBtn({ submissionId, fileName, fileSizeLabel }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function scarica() {
    if (loading) return
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/task/signed-url?submissionId=${submissionId}`)
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Download non disponibile')
        setLoading(false)
        return
      }
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch {
      setError('Errore di rete. Riprova.')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-1.5">
      <button
        onClick={scarica}
        disabled={loading}
        className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2.5 hover:bg-blue-100 transition w-fit disabled:opacity-60"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
        <span className="truncate max-w-[250px]">{fileName ?? 'File allegato'}</span>
        {fileSizeLabel && <span className="text-blue-400 flex-shrink-0">· {fileSizeLabel}</span>}
      </button>
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  )
}
