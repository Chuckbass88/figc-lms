'use client'

import { useRef, useState } from 'react'
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface Result {
  imported: number
  skipped: number
  total: number
}

export default function ImportaExcelBtn() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setLoading(true)
    setResult(null)
    setError(null)

    const fd = new FormData()
    fd.append('file', file)

    const res = await fetch('/api/quiz/importa-libreria', { method: 'POST', body: fd })
    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? 'Errore durante l\'importazione')
      return
    }

    setResult(json)
    if (json.imported > 0) window.location.reload()
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      <button
        onClick={() => { setResult(null); setError(null); inputRef.current?.click() }}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition hover:opacity-90"
        style={{ backgroundColor: '#1565C0' }}
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
        Importa da Excel
      </button>
      {result && (
        <p className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          <CheckCircle size={14} />
          {result.imported} domande importate
          {result.skipped > 0 && ` · ${result.skipped} saltate`}
        </p>
      )}
      {error && (
        <p className="flex items-center gap-1.5 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
          <AlertCircle size={14} /> {error}
        </p>
      )}
    </div>
  )
}
