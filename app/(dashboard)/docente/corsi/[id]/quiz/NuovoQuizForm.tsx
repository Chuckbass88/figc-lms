'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, Check, X, AlertCircle } from 'lucide-react'

interface Option { text: string; isCorrect: boolean }
interface Question { text: string; options: Option[] }

interface Props {
  courseId: string
  groups: { id: string; name: string }[]
}

interface FormErrors {
  title?: string
  questions?: Record<number, { text?: string; options?: string }>
  global?: string
}

const defaultQuestion = (): Question => ({
  text: '',
  options: [
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
})

export default function NuovoQuizForm({ courseId, groups }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [groupId, setGroupId] = useState('')
  const [passingScore, setPassingScore] = useState(60)
  const [timerMinutes, setTimerMinutes] = useState(30)
  const [questions, setQuestions] = useState<Question[]>([defaultQuestion()])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverWarning, setServerWarning] = useState<string | null>(null)
  const router = useRouter()

  function updateQuestion(i: number, field: 'text', value: string) {
    setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, [field]: value } : q))
    // Rimuovi errore inline al typing
    if (errors.questions?.[i]?.text) {
      setErrors(e => ({ ...e, questions: { ...e.questions, [i]: { ...e.questions?.[i], text: undefined } } }))
    }
  }

  function updateOption(qi: number, oi: number, field: 'text' | 'isCorrect', value: string | boolean) {
    setQuestions(qs => qs.map((q, idx) => {
      if (idx !== qi) return q
      const opts = q.options.map((o, j) => {
        if (field === 'isCorrect') return { ...o, isCorrect: j === oi }
        return j === oi ? { ...o, [field]: value as string } : o
      })
      return { ...q, options: opts }
    }))
    if (errors.questions?.[qi]?.options) {
      setErrors(e => ({ ...e, questions: { ...e.questions, [qi]: { ...e.questions?.[qi], options: undefined } } }))
    }
  }

  function addQuestion() {
    setQuestions(qs => [...qs, defaultQuestion()])
  }

  function removeQuestion(i: number) {
    if (questions.length <= 1) return
    setQuestions(qs => qs.filter((_, idx) => idx !== i))
    setErrors(e => {
      const q = { ...(e.questions ?? {}) }
      delete q[i]
      return { ...e, questions: q }
    })
  }

  function validate(): FormErrors {
    const errs: FormErrors = {}

    if (!title.trim()) {
      errs.title = 'Il titolo è obbligatorio'
    }

    const questionErrors: Record<number, { text?: string; options?: string }> = {}

    questions.forEach((q, i) => {
      const qErr: { text?: string; options?: string } = {}

      if (!q.text.trim()) {
        qErr.text = 'Inserisci il testo della domanda'
      }

      const filledOptions = q.options.filter(o => o.text.trim())
      if (filledOptions.length < 2) {
        qErr.options = 'Inserisci almeno 2 opzioni di risposta'
      } else if (!q.options.some(o => o.isCorrect && o.text.trim())) {
        qErr.options = 'Seleziona la risposta corretta (radio verde)'
      }

      if (qErr.text || qErr.options) questionErrors[i] = qErr
    })

    if (Object.keys(questionErrors).length > 0) {
      errs.questions = questionErrors
    }

    return errs
  }

  async function pubblica() {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setErrors({})
    setServerWarning(null)
    setLoading(true)

    const cleanedQuestions = questions.map(q => ({
      text: q.text.trim(),
      options: q.options.filter(o => o.text.trim()),
    }))

    const res = await fetch('/api/quiz/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId,
        groupId: groupId || null,
        title: title.trim(),
        description: description.trim() || null,
        passingScore,
        timerMinutes,
        questions: cleanedQuestions,
      }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setErrors({ global: json.error ?? 'Errore durante la creazione. Riprova.' })
      return
    }

    // Il server può segnalare domande parzialmente fallite (Batch 89)
    if (json.warning) {
      setServerWarning(json.warning)
    }

    setOpen(false)
    setTitle(''); setDescription(''); setGroupId(''); setPassingScore(60)
    setQuestions([defaultQuestion()])
    setTimerMinutes(30)
    router.refresh()
  }

  function resetAndClose() {
    setOpen(false)
    setErrors({})
    setServerWarning(null)
  }

  const hasErrors = Object.keys(errors).length > 0

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white font-semibold hover:opacity-90 transition"
        style={{ backgroundColor: '#1565C0' }}
      >
        <Plus size={12} /> Nuovo quiz
      </button>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-blue-900">Nuovo quiz</span>
        <button onClick={resetAndClose} className="ml-auto text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>

      {/* Errore globale server */}
      {errors.global && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
          <AlertCircle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{errors.global}</p>
        </div>
      )}

      {/* Warning server (domande parzialmente fallite) */}
      {serverWarning && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <AlertCircle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">{serverWarning}</p>
        </div>
      )}

      {/* Info quiz */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Titolo *</label>
          <input
            type="text"
            value={title}
            onChange={e => {
              setTitle(e.target.value)
              if (errors.title) setErrors(e => ({ ...e, title: undefined }))
            }}
            autoFocus
            placeholder="Es. Verifica modulo 1"
            className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.title ? 'border-red-400 bg-red-50' : 'border-gray-200'
            }`}
          />
          {errors.title && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle size={11} /> {errors.title}
            </p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Descrizione</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Punteggio minimo (%)</label>
          <input
            type="number"
            value={passingScore}
            onChange={e => setPassingScore(Number(e.target.value))}
            min={0} max={100}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Tempo limite (minuti)</label>
          <input
            type="number"
            value={timerMinutes}
            onChange={e => setTimerMinutes(Math.max(1, Number(e.target.value)))}
            min={1} max={180}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {groups.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Gruppo</label>
            <select
              value={groupId}
              onChange={e => setGroupId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Tutto il corso</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Domande */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Domande ({questions.length})
            {hasErrors && errors.questions && (
              <span className="ml-2 text-red-500 font-normal normal-case">
                — {Object.keys(errors.questions).length} con errori
              </span>
            )}
          </span>
          <button
            onClick={addQuestion}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition font-medium"
          >
            <Plus size={12} /> Aggiungi domanda
          </button>
        </div>

        {questions.map((q, qi) => {
          const qErr = errors.questions?.[qi]
          return (
            <div
              key={qi}
              className={`bg-white rounded-lg border p-4 space-y-3 ${
                qErr ? 'border-red-300' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className={`text-xs font-bold mt-2 flex-shrink-0 ${qErr ? 'text-red-400' : 'text-gray-400'}`}>
                  {qi + 1}.
                </span>
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={q.text}
                    onChange={e => updateQuestion(qi, 'text', e.target.value)}
                    placeholder="Testo della domanda *"
                    className={`w-full px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      qErr?.text ? 'border-red-400 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  {qErr?.text && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle size={10} /> {qErr.text}
                    </p>
                  )}
                </div>
                {questions.length > 1 && (
                  <button onClick={() => removeQuestion(qi)} className="text-gray-300 hover:text-red-400 mt-1 flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="ml-5 space-y-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`q${qi}-correct`}
                      checked={opt.isCorrect}
                      onChange={() => updateOption(qi, oi, 'isCorrect', true)}
                      className="flex-shrink-0 accent-green-600"
                      title="Risposta corretta"
                    />
                    <input
                      type="text"
                      value={opt.text}
                      onChange={e => updateOption(qi, oi, 'text', e.target.value)}
                      placeholder={`Opzione ${oi + 1}${oi < 2 ? ' *' : ''}`}
                      className={`flex-1 px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        opt.isCorrect ? 'border-green-300 bg-green-50' : 'border-gray-200'
                      }`}
                    />
                  </div>
                ))}
                {qErr?.options && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle size={10} /> {qErr.options}
                  </p>
                )}
                <p className="text-xs text-gray-400">Seleziona il radio della risposta corretta (verde)</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={resetAndClose}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition"
        >
          <X size={12} /> Annulla
        </button>
        <button
          onClick={pubblica}
          disabled={loading}
          className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
          style={{ backgroundColor: '#1565C0' }}
        >
          {loading && <Loader2 size={11} className="animate-spin" />}
          <Check size={11} /> Pubblica quiz
        </button>
      </div>
    </div>
  )
}
