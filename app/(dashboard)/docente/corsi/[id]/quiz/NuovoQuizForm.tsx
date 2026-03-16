'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, Check, X, ChevronDown, ChevronUp } from 'lucide-react'

interface Option { text: string; isCorrect: boolean }
interface Question { text: string; options: Option[] }

interface Props {
  courseId: string
  groups: { id: string; name: string }[]
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
  const [questions, setQuestions] = useState<Question[]>([defaultQuestion()])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function updateQuestion(i: number, field: 'text', value: string) {
    setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, [field]: value } : q))
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
  }

  function addQuestion() {
    setQuestions(qs => [...qs, defaultQuestion()])
  }

  function removeQuestion(i: number) {
    if (questions.length <= 1) return
    setQuestions(qs => qs.filter((_, idx) => idx !== i))
  }

  function isValid() {
    if (!title.trim()) return false
    for (const q of questions) {
      if (!q.text.trim()) return false
      const filled = q.options.filter(o => o.text.trim())
      if (filled.length < 2) return false
      if (!q.options.some(o => o.isCorrect && o.text.trim())) return false
    }
    return true
  }

  async function pubblica() {
    if (!isValid()) return
    setLoading(true)
    // Filter out empty options
    const cleanedQuestions = questions.map(q => ({
      text: q.text.trim(),
      options: q.options.filter(o => o.text.trim()),
    }))
    await fetch('/api/quiz/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, groupId: groupId || null, title, description, passingScore, questions: cleanedQuestions }),
    })
    setLoading(false)
    setOpen(false)
    setTitle(''); setDescription(''); setGroupId(''); setPassingScore(60)
    setQuestions([defaultQuestion()])
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white font-semibold hover:opacity-90 transition"
        style={{ backgroundColor: '#003DA5' }}
      >
        <Plus size={12} /> Nuovo quiz
      </button>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-blue-900">Nuovo quiz</span>
        <button onClick={() => setOpen(false)} className="ml-auto text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>

      {/* Info quiz */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Titolo *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
            placeholder="Es. Verifica modulo 1"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Domande ({questions.length})</span>
          <button
            onClick={addQuestion}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition font-medium"
          >
            <Plus size={12} /> Aggiungi domanda
          </button>
        </div>

        {questions.map((q, qi) => (
          <div key={qi} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-xs font-bold text-gray-400 mt-2 flex-shrink-0">{qi + 1}.</span>
              <input
                type="text"
                value={q.text}
                onChange={e => updateQuestion(qi, 'text', e.target.value)}
                placeholder="Testo della domanda"
                className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                    className={`flex-1 px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${opt.isCorrect ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                  />
                </div>
              ))}
              <p className="text-xs text-gray-400">Seleziona il radio della risposta corretta (verde)</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => setOpen(false)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition"
        >
          <X size={12} /> Annulla
        </button>
        <button
          onClick={pubblica}
          disabled={!isValid() || loading}
          className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
          style={{ backgroundColor: '#003DA5' }}
        >
          {loading && <Loader2 size={11} className="animate-spin" />}
          <Check size={11} /> Pubblica quiz
        </button>
      </div>
    </div>
  )
}
