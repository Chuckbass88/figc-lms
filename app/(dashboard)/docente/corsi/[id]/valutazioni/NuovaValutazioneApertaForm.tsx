'use client'

import { useState } from 'react'
import { Plus, X, Check, Loader2 } from 'lucide-react'
import ScoreSelector from '@/components/valutazioni/ScoreSelector'

type Student = { id: string; full_name: string }

const TIPI = [
  { value: 'generale', label: 'Generale' },
  { value: 'orale', label: 'Orale' },
  { value: 'pratica', label: 'Pratica' },
  { value: 'comportamento', label: 'Comportamento' },
]

export default function NuovaValutazioneApertaForm({
  courseId,
  students,
  onSaved,
}: {
  courseId: string
  students: Student[]
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [voto, setVoto] = useState<number | null>(null)
  const [tipo, setTipo] = useState('generale')
  const [commento, setCommento] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setOpen(false); setStudentId(''); setVoto(null); setTipo('generale'); setCommento(''); setError(null)
  }

  async function salva() {
    if (!studentId || voto == null) return
    setLoading(true); setError(null)
    const res = await fetch('/api/valutazioni/aperta/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, studentId, voto, commento, tipo }),
    })
    setLoading(false)
    if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error ?? 'Errore'); return }
    reset(); onSaved()
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
    >
      <Plus size={12} /> Voto aperto
    </button>
  )

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">Nuova valutazione aperta</span>
        <button onClick={reset}><X size={14} className="text-gray-400" /></button>
      </div>

      <select value={studentId} onChange={e => setStudentId(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
        <option value="">— Corsista —</option>
        {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
      </select>

      <div className="flex gap-2">
        {TIPI.map(t => (
          <button key={t.value} type="button" onClick={() => setTipo(t.value)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${tipo === t.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">Voto (1–10) *</p>
        <ScoreSelector value={voto} onChange={setVoto} />
      </div>

      <textarea value={commento} onChange={e => setCommento(e.target.value)}
        rows={2} placeholder="Commento opzionale..."
        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button onClick={reset} className="flex-1 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition flex items-center justify-center gap-1">
          <X size={11} /> Annulla
        </button>
        <button onClick={salva} disabled={!studentId || voto == null || loading}
          className="flex-[2] py-2 rounded-lg text-white text-xs font-semibold transition disabled:opacity-50 flex items-center justify-center gap-1"
          style={{ backgroundColor: '#1565C0' }}>
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          Salva voto
        </button>
      </div>
    </div>
  )
}
