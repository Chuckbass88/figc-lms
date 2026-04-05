'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Loader2, Check } from 'lucide-react'

const CATEGORIE = ['Esame Finale', 'Verifica Intermedia', 'Esercitazione', 'Simulazione']

export default function ModificaQuizBtn({
  quizId,
  initialTitle,
  initialDescription,
  initialPassingScore,
  initialTimerMinutes,
  initialCategory,
  initialInstructions,
  initialShuffleQuestions,
  initialAvailableFrom,
  initialAvailableUntil,
  initialAutoCloseOnTimer,
}: {
  quizId: string
  initialTitle: string
  initialDescription: string | null
  initialPassingScore: number
  initialTimerMinutes: number
  initialCategory?: string | null
  initialInstructions?: string | null
  initialShuffleQuestions?: boolean
  initialAvailableFrom?: string | null
  initialAvailableUntil?: string | null
  initialAutoCloseOnTimer?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription ?? '')
  const [passingScore, setPassingScore] = useState(initialPassingScore)
  const [timerMinutes, setTimerMinutes] = useState(initialTimerMinutes)
  const [category, setCategory] = useState(initialCategory ?? '')
  const [instructions, setInstructions] = useState(initialInstructions ?? '')
  const [shuffleQuestions, setShuffleQuestions] = useState(initialShuffleQuestions ?? false)
  const [autoCloseOnTimer, setAutoCloseOnTimer] = useState(initialAutoCloseOnTimer ?? true)
  const [availableFrom, setAvailableFrom] = useState(initialAvailableFrom ?? '')
  const [availableUntil, setAvailableUntil] = useState(initialAvailableUntil ?? '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (!title.trim() || loading) return
    setLoading(true)
    const res = await fetch(`/api/quiz/${quizId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        passing_score: passingScore,
        timer_minutes: timerMinutes,
        category: category || null,
        instructions,
        shuffle_questions: shuffleQuestions,
        auto_close_on_timer: autoCloseOnTimer,
        available_from: availableFrom || null,
        available_until: availableUntil || null,
      }),
    })
    setLoading(false)
    if (res.ok) {
      setSaved(true)
      router.refresh()
      setTimeout(() => { setSaved(false); setOpen(false) }, 1200)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
      >
        <Pencil size={14} /> Modifica
      </button>
    )
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 mt-3">
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Titolo *</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Tipologia</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
          >
            <option value="">Nessuna</option>
            {CATEGORIE.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Descrizione</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1 block">Istruzioni</label>
        <textarea
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-400"
          placeholder="Testo mostrato allo studente prima di iniziare il quiz"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Voto minimo</label>
          <input
            type="number"
            min={0}
            value={passingScore}
            onChange={e => setPassingScore(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Timer (min)</label>
          <input
            type="number"
            min={1}
            max={300}
            value={timerMinutes}
            onChange={e => setTimerMinutes(Math.max(1, Number(e.target.value)))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Apre il</label>
          <input
            type="datetime-local"
            value={availableFrom}
            onChange={e => setAvailableFrom(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Chiude il</label>
          <input
            type="datetime-local"
            value={availableUntil}
            onChange={e => setAvailableUntil(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>
      <div className="space-y-2.5">
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
          onClick={() => setAutoCloseOnTimer((v: boolean) => !v)}
          className="flex items-center gap-2.5 group w-fit"
        >
          <div className={`w-9 h-5 rounded-full transition-colors duration-200 relative flex-shrink-0 ${autoCloseOnTimer ? 'bg-blue-600' : 'bg-gray-200'}`}>
            <span className={`absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${autoCloseOnTimer ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">
            Chiudi automaticamente allo scadere del timer
            <span className="text-gray-400 font-normal ml-1">{autoCloseOnTimer ? '' : '(+25% grazia)'}</span>
          </span>
        </button>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={!title.trim() || loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
          style={{ backgroundColor: '#1565C0' }}
        >
          {loading && <Loader2 size={13} className="animate-spin" />}
          {saved && <Check size={13} />}
          {saved ? 'Salvato!' : 'Salva'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-200 hover:bg-gray-300 transition"
        >
          Annulla
        </button>
      </div>
    </div>
  )
}
