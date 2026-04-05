'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Loader2, Send, Clock, CheckCircle, Play, AlertTriangle } from 'lucide-react'

interface Option { id: string; text: string; is_correct: boolean; order_index: number }
interface Question { id: string; text: string; order_index: number; quiz_options: Option[] }

interface Props {
  quizId: string
  courseId: string
  quizTitle: string
  questions: Question[]
  passingScore: number
  timerMinutes: number
  instructions?: string | null
  autoCloseOnTimer: boolean
  penaltyWrong?: boolean
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function QuizRunner({
  quizId, courseId, quizTitle, questions, passingScore, timerMinutes, instructions, autoCloseOnTimer, penaltyWrong = false,
}: Props) {
  // Shuffle answer options once on mount
  const [displayQuestions] = useState(() =>
    questions.map(q => ({
      ...q,
      quiz_options: [...q.quiz_options].sort(() => Math.random() - 0.5),
    }))
  )
  const [confirmed, setConfirmed] = useState(false)
  const [started, setStarted] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number>(timerMinutes * 60)
  const [graceMode, setGraceMode] = useState(false)
  const [graceLeft, setGraceLeft] = useState(0)
  const autoSubmitRef = useRef(false)
  const storageKey = `quiz_start_${quizId}`

  const graceTotal = Math.ceil(timerMinutes * 60 * 0.25)

  // Inizializza timer da localStorage (solo dopo start)
  useEffect(() => {
    if (!started) return
    const stored = localStorage.getItem(storageKey)
    const now = Date.now()
    if (stored) {
      const startedAt = parseInt(stored, 10)
      const elapsed = Math.floor((now - startedAt) / 1000)
      const remaining = timerMinutes * 60 - elapsed
      setTimeLeft(remaining > 0 ? remaining : 0)
    } else {
      localStorage.setItem(storageKey, String(now))
      setTimeLeft(timerMinutes * 60)
    }
  }, [quizId, timerMinutes, storageKey, started])

  // Countdown principale
  useEffect(() => {
    if (!started || submitted || graceMode) return
    if (timeLeft <= 0) {
      if (autoCloseOnTimer) {
        if (!autoSubmitRef.current) { autoSubmitRef.current = true; handleSubmit(true) }
      } else {
        setGraceMode(true)
        setGraceLeft(graceTotal)
      }
      return
    }
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, submitted, graceMode, timeLeft])

  // Grace period countdown
  useEffect(() => {
    if (!graceMode || submitted) return
    if (graceLeft <= 0) {
      if (!autoSubmitRef.current) { autoSubmitRef.current = true; handleSubmit(true) }
      return
    }
    const interval = setInterval(() => {
      setGraceLeft(t => {
        if (t <= 1) {
          clearInterval(interval)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graceMode, submitted, graceLeft])

  function selectAnswer(questionId: string, optionId: string) {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [questionId]: optionId }))
  }

  const allAnswered = displayQuestions.every(q => answers[q.id])

  async function handleSubmit(auto = false) {
    if (submitting || submitted) return
    if (!auto && !allAnswered) return
    setSubmitting(true)

    const startedAt = localStorage.getItem(storageKey)
      ? new Date(parseInt(localStorage.getItem(storageKey)!, 10)).toISOString()
      : new Date().toISOString()

    await fetch(`/api/quiz/${quizId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, startedAt }),
    })

    localStorage.removeItem(storageKey)
    setSubmitting(false)
    setSubmitted(true)
  }

  // Schermata post-consegna
  if (submitted) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
          <CheckCircle size={32} className="text-blue-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Quiz consegnato</h3>
        <p className="text-gray-500 text-sm">
          Le tue risposte sono state registrate. Il docente analizzerà i risultati.
        </p>
        <a
          href={`/studente/corsi/${courseId}/quiz`}
          className="inline-block mt-4 text-sm text-blue-600 hover:underline"
        >
          ← Torna alla lista quiz
        </a>
      </div>
    )
  }

  // Schermata introduttiva (sempre mostrata)
  if (!started) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header con logo */}
        <div className="bg-gradient-to-br from-blue-700 to-blue-900 px-8 py-8 text-white text-center">
          <Image
            src="/logo-coachlab-white.png"
            alt="CoachLab"
            width={140}
            height={40}
            className="mx-auto mb-5 object-contain"
          />
          <h2 className="text-xl font-bold">{quizTitle}</h2>
        </div>

        {/* Metadati */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
          <div className="px-4 py-5 text-center">
            <p className="text-2xl font-bold text-gray-900">{displayQuestions.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">domande</p>
          </div>
          <div className="px-4 py-5 text-center">
            <p className="text-2xl font-bold text-gray-900">{timerMinutes}</p>
            <p className="text-xs text-gray-500 mt-0.5">minuti</p>
          </div>
          <div className="px-4 py-5 text-center">
            <p className="text-2xl font-bold text-gray-900">{passingScore}</p>
            <p className="text-xs text-gray-500 mt-0.5">punti min.</p>
          </div>
        </div>

        {/* Regole punteggio */}
        {penaltyWrong && (
          <div className="px-8 pt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 flex items-center gap-2">
              <span className="font-semibold">Attenzione:</span>
              risposta corretta +1 punto · risposta sbagliata −1 punto · non risposta 0 punti
            </div>
          </div>
        )}

        {/* Istruzioni */}
        {instructions ? (
          <div className="px-8 py-5">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Istruzioni</h4>
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{instructions}</p>
            </div>
          </div>
        ) : (
          <div className="px-8 py-5">
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500 text-center">
              Leggi attentamente ogni domanda. Hai {timerMinutes} minuti di tempo.
            </div>
          </div>
        )}

        {/* Conferma + Avvio */}
        <div className="px-8 pb-8 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="mt-0.5 flex-shrink-0 w-4 h-4 accent-blue-600 cursor-pointer"
            />
            <span className="text-sm text-gray-700 select-none">
              Ho letto e compreso le istruzioni del quiz. Sono pronto/a a iniziare.
            </span>
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStarted(true)}
              disabled={!confirmed}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#1565C0' }}
            >
              <Play size={15} /> Inizia quiz
            </button>
            <p className="text-xs text-gray-400">Il timer partirà al click.</p>
          </div>
        </div>
      </div>
    )
  }

  const isWarning = timeLeft <= 300 && timeLeft > 0
  const isDanger = timeLeft <= 60 && timeLeft > 0
  const isExpired = timeLeft === 0

  return (
    <div className="space-y-5">
      {/* Timer sticky sempre visibile */}
      <div className={`sticky top-0 z-10 rounded-xl border shadow-sm ${
        graceMode ? 'bg-orange-50 border-orange-300' :
        isExpired ? 'bg-red-50 border-red-200' :
        isDanger ? 'bg-red-50 border-red-200' :
        isWarning ? 'bg-amber-50 border-amber-200' :
        'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between px-4 py-2.5">
          <p className="text-xs text-gray-500 font-medium">
            {Object.keys(answers).length}/{displayQuestions.length} risposte date
          </p>
          <div className={`flex items-center gap-1.5 font-mono font-bold text-sm ${
            graceMode ? 'text-orange-700' :
            isDanger || isExpired ? 'text-red-600' :
            isWarning ? 'text-amber-600' : 'text-gray-700'
          }`}>
            <Clock size={14} className={
              graceMode ? 'text-orange-500' :
              isDanger || isExpired ? 'text-red-500' :
              isWarning ? 'text-amber-500' : 'text-gray-400'
            } />
            {graceMode ? formatTime(graceLeft) : formatTime(timeLeft)}
          </div>
        </div>
        {/* Barra progresso timer */}
        <div className="h-1 bg-gray-100 rounded-b-xl overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              graceMode ? 'bg-orange-400' :
              isDanger ? 'bg-red-500' :
              isWarning ? 'bg-amber-400' : 'bg-blue-500'
            }`}
            style={{
              width: graceMode
                ? `${Math.round((graceLeft / graceTotal) * 100)}%`
                : `${Math.round((timeLeft / (timerMinutes * 60)) * 100)}%`
            }}
          />
        </div>
      </div>

      {/* Banner grace period */}
      {graceMode && (
        <div className="bg-orange-50 border border-orange-300 rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Tempo scaduto</p>
            <p className="text-xs text-orange-700 mt-0.5">
              Hai ancora {formatTime(graceLeft)} di tempo aggiuntivo per completare e consegnare il quiz.
              Passato questo limite il quiz verrà consegnato automaticamente.
            </p>
          </div>
        </div>
      )}

      {/* Domande */}
      {displayQuestions.map((q, qi) => (
        <div key={q.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">{qi + 1}. {q.text}</p>
          <div className="space-y-2">
            {q.quiz_options.map(opt => {
              const selected = answers[q.id] === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => selectAnswer(q.id, opt.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition ${
                    selected
                      ? 'border-blue-500 bg-blue-50 text-blue-800 font-medium'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {opt.text}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-end">
        <button
          onClick={() => handleSubmit(false)}
          disabled={!allAnswered || submitting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
          style={{ backgroundColor: '#1565C0' }}
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          Invia risposte
        </button>
      </div>
    </div>
  )
}
