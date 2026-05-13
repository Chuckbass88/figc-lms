'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star, Loader2, Check, Eye, EyeOff, AlertTriangle } from 'lucide-react'

interface Props {
  submissionId: string
  studentId: string
  taskTitle: string
  courseId: string
  gradingScale?: number
  gradeVisible?: boolean
  initialGradeDecimal?: number | null
  initialFeedback?: string | null
}

export default function ValutaBtn({
  submissionId, studentId, taskTitle, courseId,
  gradingScale = 10, gradeVisible: initialGradeVisible = false,
  initialGradeDecimal, initialFeedback,
}: Props) {
  const [open, setOpen]               = useState(false)
  const [grade, setGrade]             = useState(initialGradeDecimal != null ? String(initialGradeDecimal) : '')
  const [feedback, setFeedback]       = useState(initialFeedback ?? '')
  const [shareGrade, setShareGrade]   = useState(initialGradeVisible)
  const [loading, setLoading]         = useState(false)
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const router = useRouter()

  const gradeNum = parseFloat(grade)
  const gradeDisplay = !isNaN(gradeNum) ? (gradeNum * (gradingScale / 10)).toFixed(1) : null
  const isValid = !isNaN(gradeNum) && gradeNum >= 0 && gradeNum <= 10
  const isAlreadyGraded = initialGradeDecimal != null

  async function salva() {
    if (!isValid) { setError('Inserisci un voto tra 0 e 10'); return }
    setLoading(true)
    setError(null)
    const res = await fetch('/api/task/valuta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissionId, gradeDecimal: gradeNum, feedback, studentId,
        taskTitle, courseId, gradeVisible: shareGrade,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setOpen(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  if (saved) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-lg">
        <Check size={11} /> Valutazione salvata
      </span>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition ${
          isAlreadyGraded
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        }`}
      >
        <Star size={11} />
        {isAlreadyGraded
          ? `Voto: ${(initialGradeDecimal! * (gradingScale / 10)).toFixed(1)}/${gradingScale}`
          : 'Valuta e chiudi'}
      </button>
    )
  }

  return (
    <div className="mt-3 p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
      {isAlreadyGraded && (
        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle size={12} />
          Questa task è già valutata. Modificare sovrascriverà il voto precedente.
        </div>
      )}

      <div className="flex gap-3">
        {/* Voto */}
        <div className="w-36">
          <label className="text-xs font-semibold text-gray-600 block mb-1">
            Voto (0–10) <span className="text-gray-400 font-normal">con decimali</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min={0} max={10} step={0.5}
              value={grade}
              onChange={e => setGrade(e.target.value)}
              placeholder="Es. 7.5"
              autoFocus
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {gradeDisplay && (
            <p className="text-xs text-gray-500 mt-1">
              = <strong>{gradeDisplay}/{gradingScale}</strong> scala corso
            </p>
          )}
        </div>

        {/* Feedback */}
        <div className="flex-1">
          <label className="text-xs font-semibold text-gray-600 block mb-1">Feedback (opzionale)</label>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Commento per il corsista..."
            rows={2}
            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Toggle condividi voto */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <div
          onClick={() => setShareGrade(v => !v)}
          className={`relative w-8 h-4 rounded-full transition ${shareGrade ? 'bg-blue-600' : 'bg-gray-300'}`}
        >
          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${shareGrade ? 'left-4.5' : 'left-0.5'}`} />
        </div>
        <span className="text-xs text-gray-600 flex items-center gap-1">
          {shareGrade ? <Eye size={12} /> : <EyeOff size={12} />}
          {shareGrade ? 'Voto visibile allo studente' : 'Voto privato (solo per uso interno)'}
        </span>
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => setOpen(false)}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
        >
          Annulla
        </button>
        <button
          onClick={salva}
          disabled={loading || !isValid}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white font-semibold disabled:opacity-50 hover:opacity-90 transition"
          style={{ backgroundColor: '#1EB8E5' }}
        >
          {loading && <Loader2 size={11} className="animate-spin" />}
          <Check size={11} /> Valuta e chiudi task
        </button>
      </div>
    </div>
  )
}
