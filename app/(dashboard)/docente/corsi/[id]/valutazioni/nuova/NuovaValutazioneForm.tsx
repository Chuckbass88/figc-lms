'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import ScoreSelector from '@/components/valutazioni/ScoreSelector'

type Criterion = { id: string; name: string; position: number }
type Section = { id: string; name: string; position: number; criteria: Criterion[] }
type Template = { id: string; name: string; description: string | null; sections: Section[] }
type Student = { id: string; full_name: string }

interface Props {
  courseId: string
  students: Student[]
  templates: Template[]
}

const SECTION_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-200' },
  1: { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-200' },
  2: { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-200' },
}

const FEEDBACK_PLACEHOLDER = `Note qualitative — guida per il feedback:

• Conclusione: vi è venuto in mente altro da aggiungere? Siete soddisfatti della fase come è venuta?
• Dal foglio al campo: che difficoltà avete incontrato?
• Coaching esecutori: come hanno spiegato il lavoro alla squadra? Quali difficoltà nell'esecuzione?
• Struttura PAGS AdP: consequenzialità tra le fasi? Pertinenza tra obiettivo e svolgimento?
• Ruoli e interazione: hanno rispettato i ruoli? Che tipo di interazione c'è stata?`

export default function NuovaValutazioneForm({ courseId, students, templates }: Props) {
  const router = useRouter()

  const [studentId, setStudentId] = useState('')
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [evalDate, setEvalDate] = useState(new Date().toISOString().split('T')[0])
  const [sessionLabel, setSessionLabel] = useState('')
  const [globalNote, setGlobalNote] = useState('')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})
  const [criterionNotes, setCriterionNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedTemplate = useMemo(
    () => templates.find(t => t.id === templateId),
    [templates, templateId]
  )

  const allCriteria = useMemo(
    () => selectedTemplate?.sections.flatMap(s => s.criteria) ?? [],
    [selectedTemplate]
  )

  const completedCount = allCriteria.filter(c => scores[c.id] != null).length
  const totalCount = allCriteria.length
  const avgScore = completedCount > 0
    ? (Object.values(scores).reduce((a, b) => a + b, 0) / completedCount).toFixed(1)
    : null

  const canSubmit = studentId && templateId && completedCount === totalCount

  function toggleNote(id: string) {
    setExpandedNotes(p => ({ ...p, [id]: !p[id] }))
  }

  async function submit() {
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/valutazioni/pratica/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId,
        studentId,
        templateId,
        evaluationDate: evalDate,
        sessionLabel: sessionLabel || undefined,
        globalNote: globalNote || undefined,
        scores: allCriteria.map(c => ({
          criterionId: c.id,
          score: scores[c.id],
          note: criterionNotes[c.id] || undefined,
        })),
      }),
    })

    setLoading(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Errore durante il salvataggio')
      return
    }
    router.push(`/docente/corsi/${courseId}/valutazioni`)
    router.refresh()
  }

  return (
    <div className="pb-32">

      {/* Info valutazione */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 mb-5">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Corsista <span className="text-red-400">*</span>
          </label>
          <select
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— Seleziona corsista —</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Schema di valutazione <span className="text-red-400">*</span>
          </label>
          <select
            value={templateId}
            onChange={e => setTemplateId(e.target.value)}
            className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Data <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={evalDate}
              onChange={e => setEvalDate(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Etichetta <span className="text-gray-400 font-normal">(opz.)</span>
            </label>
            <input
              type="text"
              value={sessionLabel}
              onChange={e => setSessionLabel(e.target.value)}
              placeholder="es. AdP Blocco 3"
              className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-3 mb-5 flex items-center gap-3">
          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(completedCount / totalCount) * 100}%`,
                backgroundColor: completedCount === totalCount ? '#16a34a' : '#1565C0'
              }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-500 flex-shrink-0">
            {completedCount}/{totalCount} criteri
          </span>
          {avgScore && (
            <span className="text-sm font-bold text-blue-700 flex-shrink-0">
              Media: {avgScore}
            </span>
          )}
        </div>
      )}

      {/* Sezioni e criteri */}
      {selectedTemplate?.sections.map((section, sIdx) => {
        const colors = SECTION_COLORS[sIdx % 3]
        return (
          <div key={section.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
            {/* Section header */}
            <div className={`px-5 py-3 ${colors.bg}`}>
              <h3 className={`font-bold text-base ${colors.text}`}>{section.name}</h3>
              <p className={`text-xs opacity-80 ${colors.text}`}>
                {section.criteria.filter(c => scores[c.id] != null).length}/{section.criteria.length} completati
              </p>
            </div>

            {/* Criteria */}
            <div className="divide-y divide-gray-50">
              {section.criteria.map(criterion => {
                const hasNote = expandedNotes[criterion.id]
                const scored = scores[criterion.id] != null
                return (
                  <div key={criterion.id} className={`p-4 ${scored ? '' : ''}`}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <p className="text-sm font-semibold text-gray-800 leading-snug flex-1">
                        {criterion.name}
                      </p>
                      {scored && (
                        <span className="text-xs font-bold text-green-600 flex-shrink-0 mt-0.5">
                          ✓ {scores[criterion.id]}
                        </span>
                      )}
                    </div>

                    <ScoreSelector
                      value={scores[criterion.id] ?? null}
                      onChange={v => setScores(p => ({ ...p, [criterion.id]: v }))}
                    />

                    {/* Note toggle */}
                    <button
                      type="button"
                      onClick={() => toggleNote(criterion.id)}
                      className="mt-2.5 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition"
                    >
                      {hasNote ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {hasNote ? 'Nascondi nota' : 'Aggiungi nota'}
                    </button>

                    {hasNote && (
                      <textarea
                        value={criterionNotes[criterion.id] ?? ''}
                        onChange={e => setCriterionNotes(p => ({ ...p, [criterion.id]: e.target.value }))}
                        rows={2}
                        placeholder="Nota specifica su questo criterio..."
                        className="mt-2 w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Note qualitative / Feedback campo */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Note qualitative <span className="text-gray-400 font-normal">(feedback campo — opzionale)</span>
        </label>
        <textarea
          value={globalNote}
          onChange={e => setGlobalNote(e.target.value)}
          rows={7}
          placeholder={FEEDBACK_PLACEHOLDER}
          className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 rounded-xl border border-red-100 mb-4 text-sm text-red-700">
          <AlertCircle size={14} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Sticky submit bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-3 safe-area-pb">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {avgScore && (
            <div className="flex-1 text-center">
              <p className="text-xs text-gray-500">Voto medio</p>
              <p className="text-2xl font-black text-blue-700">{avgScore}<span className="text-sm font-normal text-gray-400">/10</span></p>
            </div>
          )}
          <button
            onClick={submit}
            disabled={!canSubmit || loading}
            className="flex-[2] flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base transition disabled:opacity-40"
            style={{ backgroundColor: canSubmit ? '#1565C0' : '#94a3b8' }}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <CheckCircle size={18} />
            )}
            {loading ? 'Salvataggio…' : 'Pubblica valutazione'}
          </button>
        </div>
      </div>
    </div>
  )
}
