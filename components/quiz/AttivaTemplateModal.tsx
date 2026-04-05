'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Check, Loader2, Archive, Calendar, CheckCircle2 } from 'lucide-react'
import type { CourseForQuiz } from './CreaQuizModal'

interface Template {
  id: string
  title: string
  description: string | null
  category: string | null
  _count: number
}

interface Props {
  template: Template
  courses: CourseForQuiz[]
}

/**
 * AttivaTemplateModal
 * Modale focalizzato per attivare un quiz pre-archiviato in un corso specifico.
 * Carica le domande dal template via API e crea il quiz nel corso scelto.
 */
export default function AttivaTemplateModal({ template, courses }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [courseId, setCourseId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [title, setTitle] = useState(template.title)
  const [useAvailableFrom, setUseAvailableFrom] = useState(false)
  const [availableFrom, setAvailableFrom] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successCourseName, setSuccessCourseName] = useState<string | null>(null)

  const selectedCourse = courses.find(c => c.id === courseId)
  const groups = selectedCourse?.groups ?? []

  function handleOpen() {
    setTitle(template.title)
    setCourseId('')
    setGroupId('')
    setUseAvailableFrom(false)
    setAvailableFrom('')
    setError('')
    setSuccessCourseName(null)
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    setSuccessCourseName(null)
    setError('')
  }

  async function handleAttiva() {
    if (!courseId || !title.trim()) {
      setError('Seleziona un corso e verifica il titolo.')
      return
    }
    setLoading(true)
    setError('')
    try {
      // 1. Carica le domande del template
      const res = await fetch(`/api/quiz/template/${template.id}`)
      if (!res.ok) throw new Error('Impossibile caricare il template')
      const data = await res.json()

      if (!data.questions?.length) {
        setError('Il template non contiene domande. Aggiungine prima di attivarlo.')
        setLoading(false)
        return
      }

      // 2. Normalizza domande nel formato atteso da /api/quiz/create
      const questions = data.questions.map((q: {
        text: string
        points?: number
        options: { text: string; is_correct: boolean }[]
      }) => ({
        text: q.text.trim(),
        points: q.points ?? 1,
        options: q.options
          .filter((o: { text: string }) => o.text?.trim())
          .map((o: { text: string; is_correct: boolean }) => ({ text: o.text, isCorrect: o.is_correct })),
      }))

      // 3. Calcola availableFrom (null = disponibile subito)
      const availableFromISO = useAvailableFrom && availableFrom
        ? new Date(availableFrom).toISOString()
        : null

      // 4. Crea il quiz nel corso selezionato
      const createRes = await fetch('/api/quiz/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          groupId: groupId || null,
          title: title.trim(),
          category: template.category ?? null,
          description: template.description ?? null,
          instructions: null,
          passingScore: 18,
          timerMinutes: 30,
          shuffleQuestions: false,
          availableFrom: availableFromISO,
          availableUntil: null,
          autoCloseOnTimer: true,
          questions,
          penaltyWrong: data.penalty_wrong ?? false,
          questionsPerStudent: data.questions_per_student ?? null,
        }),
      })

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}))
        throw new Error(errData.error ?? 'Errore durante la creazione del quiz')
      }

      // 5. Mostra successo con nome corso, poi chiudi e aggiorna
      const courseName = selectedCourse?.name ?? courseId
      setSuccessCourseName(courseName)
      router.refresh()
      setTimeout(() => {
        setOpen(false)
        setSuccessCourseName(null)
      }, 2200)
    } catch (err: any) {
      setError(err.message ?? 'Errore imprevisto')
    } finally {
      setLoading(false)
    }
  }

  // Bottone chiuso
  if (!open) {
    return (
      <button
        onClick={handleOpen}
        disabled={courses.length === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        style={{ backgroundColor: '#1565C0' }}
        title={courses.length === 0 ? 'Nessun corso disponibile' : `Attiva "${template.title}" in un corso`}
      >
        <Archive size={12} /> Attiva nel corso
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* ── Toast successo ── */}
        {successCourseName ? (
          <div className="px-6 py-10 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 size={30} className="text-green-600" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">Quiz attivato con successo</p>
              <p className="text-sm text-gray-500 mt-1">
                per il corso <span className="font-semibold text-gray-800">{successCourseName}</span>
              </p>
              {useAvailableFrom && availableFrom && (
                <p className="text-xs text-gray-400 mt-1.5">
                  Disponibile dal {new Date(availableFrom).toLocaleString('it-IT', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
              <div className="min-w-0 pr-4">
                <h3 className="text-base font-bold text-gray-900">Attiva quiz nel corso</h3>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                  <Archive size={11} className="text-indigo-500" />
                  <span className="truncate font-medium text-indigo-700">{template.title}</span>
                  <span className="text-gray-300">·</span>
                  <span>{template._count} domande</span>
                </p>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition flex-shrink-0">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Corso */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                  Corso destinatario *
                </label>
                <select
                  value={courseId}
                  onChange={e => { setCourseId(e.target.value); setGroupId('') }}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  autoFocus
                >
                  <option value="">Seleziona un corso...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Gruppo (solo se il corso ha gruppi) */}
              {groups.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                    Gruppo <span className="font-normal text-gray-400">(opzionale)</span>
                  </label>
                  <select
                    value={groupId}
                    onChange={e => setGroupId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Tutto il corso</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Titolo (pre-compilato, modificabile) */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                  Titolo quiz *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Titolo del quiz"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Pre-compilato dal template. Modificalo se necessario.
                </p>
              </div>

              {/* Data/ora inizio — opzionale */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition select-none">
                  <input
                    type="checkbox"
                    checked={useAvailableFrom}
                    onChange={e => {
                      setUseAvailableFrom(e.target.checked)
                      if (!e.target.checked) setAvailableFrom('')
                    }}
                    className="w-4 h-4 accent-blue-600 flex-shrink-0"
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Definisci data e ora di inizio</p>
                      <p className="text-xs text-gray-400">Se non impostata, il quiz è disponibile subito</p>
                    </div>
                  </div>
                </label>
                {useAvailableFrom && (
                  <div className="px-4 pb-3 border-t border-gray-100 bg-gray-50">
                    <input
                      type="datetime-local"
                      value={availableFrom}
                      onChange={e => setAvailableFrom(e.target.value)}
                      className="mt-3 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Info template */}
              {template.description && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  {template.description}
                </p>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                  {error}
                </p>
              )}

              <p className="text-xs text-gray-400">
                Il quiz verrà creato con le domande del template. Potrai modificare voto minimo,
                timer e altre impostazioni dalla pagina del quiz dopo la creazione.
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 transition"
              >
                Annulla
              </button>
              <button
                onClick={handleAttiva}
                disabled={!courseId || !title.trim() || loading || (useAvailableFrom && !availableFrom)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
                style={{ backgroundColor: '#1565C0' }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {loading ? 'Attivazione...' : 'Attiva quiz'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
