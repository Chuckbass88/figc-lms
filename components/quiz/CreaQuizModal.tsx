'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, Check, X, Archive, ChevronDown, ChevronUp } from 'lucide-react'

interface Option { text: string; isCorrect: boolean }
interface Question { text: string; points: number; options: Option[] }

export interface CourseForQuiz {
  id: string
  name: string
  groups: { id: string; name: string }[]
}

interface QuizTemplate {
  id: string
  title: string
  description: string | null
  category: string | null
  course_tag: string | null
  _count: number
}

interface Props {
  courses: CourseForQuiz[]
  defaultCourseId?: string
  label?: string
}

const CATEGORIE = ['Esame Finale', 'Verifica Intermedia', 'Esercitazione', 'Simulazione']

const defaultQuestion = (): Question => ({
  text: '',
  points: 1,
  options: [
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
})

export default function CreaQuizModal({ courses, defaultCourseId, label = 'Crea quiz' }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [courseId, setCourseId] = useState(defaultCourseId ?? '')
  const [groupId, setGroupId] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [passingScore, setPassingScore] = useState(18)
  const [timerMinutes, setTimerMinutes] = useState(30)
  const [shuffleQuestions, setShuffleQuestions] = useState(false)
  const [autoCloseOnTimer, setAutoCloseOnTimer] = useState(true)
  const [availableFrom, setAvailableFrom] = useState('')
  const [availableUntil, setAvailableUntil] = useState('')
  const [questions, setQuestions] = useState<Question[]>([defaultQuestion()])
  const [penaltyWrong, setPenaltyWrong] = useState(false)
  const [questionsPerStudent, setQuestionsPerStudent] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  // Paniere (quiz pre-archiviati)
  const [showPaniere, setShowPaniere] = useState(false)
  const [templates, setTemplates] = useState<QuizTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [loadedTemplateName, setLoadedTemplateName] = useState<string | null>(null)

  const selectedCourse = courses.find(c => c.id === courseId)
  const groups = selectedCourse?.groups ?? []

  function updateQuestion(i: number, field: 'text' | 'points', value: string | number) {
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

  function addQuestion() { setQuestions(qs => [...qs, defaultQuestion()]) }
  function removeQuestion(i: number) {
    if (questions.length <= 1) return
    setQuestions(qs => qs.filter((_, idx) => idx !== i))
  }

  function isValid() {
    if (!courseId || !title.trim()) return false
    for (const q of questions) {
      if (!q.text.trim()) return false
      const filled = q.options.filter(o => o.text.trim())
      if (filled.length < 2) return false
      if (!q.options.some(o => o.isCorrect && o.text.trim())) return false
    }
    return true
  }

  function reset() {
    setOpen(false)
    setTitle(''); setCategory(''); setDescription(''); setInstructions('')
    setGroupId(''); setPassingScore(18); setTimerMinutes(30)
    setShuffleQuestions(false); setAutoCloseOnTimer(true); setAvailableFrom(''); setAvailableUntil('')
    setQuestions([defaultQuestion()]); setPenaltyWrong(false); setQuestionsPerStudent(null)
    setShowPaniere(false); setTemplates([]); setLoadedTemplateName(null)
    if (!defaultCourseId) setCourseId('')
  }

  async function openPaniere() {
    setShowPaniere(v => {
      if (!v && templates.length === 0) {
        setLoadingTemplates(true)
        fetch('/api/quiz/templates')
          .then(r => r.json())
          .then(data => { setTemplates(data.templates ?? []); setLoadingTemplates(false) })
          .catch(() => setLoadingTemplates(false))
      }
      return !v
    })
  }

  async function loadTemplate(tpl: QuizTemplate) {
    const res = await fetch(`/api/quiz/template/${tpl.id}`)
    const data = await res.json()
    if (data.questions) {
      const loaded: Question[] = data.questions.map((q: { text: string; points: number; options: { text: string; is_correct: boolean }[] }) => ({
        text: q.text,
        points: q.points ?? 1,
        options: q.options.map((o: { text: string; is_correct: boolean }) => ({ text: o.text, isCorrect: o.is_correct })),
      }))
      setQuestions(loaded)
      setLoadedTemplateName(tpl.title)
      if (tpl.category && CATEGORIE.includes(tpl.category)) setCategory(tpl.category)
      if (data.penalty_wrong) setPenaltyWrong(data.penalty_wrong)
      if (data.questions_per_student) setQuestionsPerStudent(data.questions_per_student)
    }
    setShowPaniere(false)
  }

  async function pubblica() {
    if (!isValid() || loading) return
    setLoading(true)
    const cleanedQuestions = questions.map(q => ({
      text: q.text.trim(),
      points: q.points,
      options: q.options.filter(o => o.text.trim()),
    }))
    await fetch('/api/quiz/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId,
        groupId: groupId || null,
        title,
        category: category || null,
        description,
        instructions,
        passingScore,
        timerMinutes,
        shuffleQuestions,
        availableFrom: availableFrom || null,
        availableUntil: availableUntil || null,
        autoCloseOnTimer,
        questions: cleanedQuestions,
        penaltyWrong,
        questionsPerStudent,
      }),
    })
    setLoading(false)
    reset()
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition"
        style={{ backgroundColor: '#1565C0' }}
      >
        <Plus size={14} /> {label}
      </button>
    )
  }

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Crea nuovo quiz</h3>
          <button onClick={reset} className="text-gray-400 hover:text-gray-600 transition">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[calc(100vh-12rem)] overflow-y-auto">

          {/* Sezione 0: Paniere */}
          <div className="border border-indigo-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={openPaniere}
              className="w-full flex items-center gap-2 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 transition text-left"
            >
              <Archive size={14} className="text-indigo-600 flex-shrink-0" />
              <span className="text-xs font-semibold text-indigo-700 flex-1">
                {loadedTemplateName ? `Da paniere: ${loadedTemplateName}` : 'Carica da quiz pre-archiviato (paniere)'}
              </span>
              {showPaniere ? <ChevronUp size={14} className="text-indigo-500" /> : <ChevronDown size={14} className="text-indigo-500" />}
            </button>
            {showPaniere && (
              <div className="bg-white border-t border-indigo-100 p-3">
                {loadingTemplates ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                    <Loader2 size={12} className="animate-spin" /> Caricamento...
                  </div>
                ) : templates.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">Nessun quiz pre-archiviato disponibile. Creane uno dalla panoramica quiz.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {templates.map(tpl => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => loadTemplate(tpl)}
                        className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 flex-1">{tpl.title}</span>
                          {tpl.course_tag && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{tpl.course_tag}</span>
                          )}
                          {tpl.category && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{tpl.category}</span>
                          )}
                          <span className="text-xs text-gray-400">{tpl._count} dom.</span>
                        </div>
                        {tpl.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{tpl.description}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sezione 1: Destinatari */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Destinatari</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {!defaultCourseId && (
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Corso *</label>
                  <select
                    value={courseId}
                    onChange={e => { setCourseId(e.target.value); setGroupId('') }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Seleziona corso...</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {groups.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Gruppo</label>
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
          </div>

          {/* Sezione 2: Informazioni */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Informazioni</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-600 block mb-1">Titolo *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  autoFocus
                  placeholder="Es. Esame finale modulo A"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Tipologia</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Nessuna</option>
                  {CATEGORIE.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Descrizione</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Breve descrizione"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Istruzioni <span className="text-gray-400 font-normal">(mostrate allo studente prima di iniziare)</span>
                </label>
                <textarea
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  rows={2}
                  placeholder="Es. Leggi ogni domanda con attenzione. Non puoi tornare indietro. Il quiz si chiude automaticamente allo scadere del tempo."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Sezione 3: Regole */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Regole</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Voto minimo
                  {totalPoints > 0 && <span className="text-gray-400 font-normal ml-1">/ {totalPoints} pt</span>}
                </label>
                <input
                  type="number" value={passingScore}
                  onChange={e => setPassingScore(Number(e.target.value))}
                  min={0}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Timer (min)</label>
                <input
                  type="number" value={timerMinutes}
                  onChange={e => setTimerMinutes(Math.max(1, Number(e.target.value)))}
                  min={1} max={300}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Apre il</label>
                <input
                  type="datetime-local" value={availableFrom}
                  onChange={e => setAvailableFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Chiude il</label>
                <input
                  type="datetime-local" value={availableUntil}
                  onChange={e => setAvailableUntil(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-3 space-y-2.5">
              <button
                type="button"
                onClick={() => setShuffleQuestions(v => !v)}
                className="flex items-center gap-2.5 group w-fit"
              >
                <div className={`w-9 h-5 rounded-full transition-colors duration-200 relative flex-shrink-0 ${shuffleQuestions ? 'bg-blue-600' : 'bg-gray-200'}`}>
                  <span className={`absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${shuffleQuestions ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">Mischia ordine domande</span>
              </button>
              <button
                type="button"
                onClick={() => setAutoCloseOnTimer(v => !v)}
                className="flex items-center gap-2.5 group w-fit"
              >
                <div className={`w-9 h-5 rounded-full transition-colors duration-200 relative flex-shrink-0 ${autoCloseOnTimer ? 'bg-blue-600' : 'bg-gray-200'}`}>
                  <span className={`absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${autoCloseOnTimer ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">
                  Chiudi automaticamente allo scadere del timer
                  <span className="text-gray-400 font-normal ml-1">{autoCloseOnTimer ? '' : '(+25% tempo di grazia)'}</span>
                </span>
              </button>
            </div>
          </div>

          {/* Sezione 4: Domande */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Domande ({questions.length}) · {totalPoints} punti totali
              </h4>
              <button
                onClick={addQuestion}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition font-medium"
              >
                <Plus size={12} /> Aggiungi domanda
              </button>
            </div>
            <div className="space-y-4">
              {questions.map((q, qi) => (
                <div key={qi} className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-gray-400 mt-2 flex-shrink-0">{qi + 1}.</span>
                    <input
                      type="text"
                      value={q.text}
                      onChange={e => updateQuestion(qi, 'text', e.target.value)}
                      placeholder="Testo della domanda"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {questions.length > 1 && (
                      <button onClick={() => removeQuestion(qi)} className="text-gray-300 hover:text-red-400 mt-1 flex-shrink-0">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {/* Difficoltà */}
                  <div className="ml-5">
                    <button
                      type="button"
                      onClick={() => updateQuestion(qi, 'points', q.points === 2 ? 1 : 2)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                        q.points === 2
                          ? 'bg-orange-50 border-orange-300 text-orange-700'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {q.points === 2 ? '⚡ Difficile (2 punti)' : '· Standard (1 punto)'}
                    </button>
                  </div>
                  <div className="ml-5 space-y-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`modal-q${qi}-correct`}
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
                          className={`flex-1 px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${opt.isCorrect ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}
                        />
                      </div>
                    ))}
                    <p className="text-xs text-gray-400">🟢 Seleziona il radio della risposta corretta</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 transition"
          >
            Annulla
          </button>
          <button
            onClick={pubblica}
            disabled={!isValid() || loading}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
            style={{ backgroundColor: '#1565C0' }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Pubblica quiz
          </button>
        </div>
      </div>
    </div>
  )
}
