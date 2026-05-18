'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Loader2, Send, Clock, CheckCircle, Play, AlertTriangle, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface Option { id: string; text: string; is_correct?: boolean; order_index?: number }
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
  libraryMode?: boolean
  questionCount?: number
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function QuizRunner({
  quizId, courseId, quizTitle, questions, passingScore, timerMinutes, instructions, autoCloseOnTimer, penaltyWrong = false,
  libraryMode = false, questionCount = 0,
}: Props) {
  // Quiz manuali: opzioni mescolate on mount. Quiz da libreria: domande caricate al via.
  const [displayQuestions, setDisplayQuestions] = useState<Question[]>(() =>
    libraryMode
      ? []
      : questions.map(q => ({
          ...q,
          quiz_options: [...q.quiz_options].sort(() => Math.random() - 0.5),
        }))
  )
  const [confirmed, setConfirmed] = useState(false)
  const [started, setStarted] = useState(false)
  const [startLoading, setStartLoading] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  async function beginQuiz() {
    if (!libraryMode) { setStarted(true); return }
    setStartLoading(true); setStartError(null)
    try {
      const res = await fetch(`/api/quiz/${quizId}/start`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setStartError(data.error ?? 'Errore avvio prova'); setStartLoading(false); return }
      const qs: Question[] = (data.questions ?? []).map((q: { id: string; text: string; options: { id: string; text: string }[] }, i: number) => ({
        id: q.id,
        text: q.text,
        order_index: i,
        quiz_options: q.options.map((o, j) => ({ id: o.id, text: o.text, order_index: j })),
      }))
      if (qs.length === 0) { setStartError('Nessuna domanda disponibile per questa prova.'); setStartLoading(false); return }
      setDisplayQuestions(qs)
      setStarted(true)
    } catch {
      setStartError('Errore di rete. Riprova.')
    }
    setStartLoading(false)
  }
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
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

  const answeredCount = Object.keys(answers).length
  const unansweredCount = displayQuestions.length - answeredCount

  async function handleSubmit(auto = false) {
    if (submitting || submitted) return
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
        <h3 className="text-xl font-bold text-gray-900">Prova consegnata</h3>
        <p className="text-gray-500 text-sm">
          Le tue risposte sono state registrate. Il docente analizzerà i risultati.
        </p>
        <a
          href={`/studente/corsi/${courseId}/quiz`}
          className="inline-block mt-4 text-sm text-blue-600 hover:underline"
        >
          ← Torna alla lista
        </a>
      </div>
    )
  }

  // Schermata introduttiva (riepilogo regole)
  if (!started) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header con logo */}
        <div className="bg-gradient-to-br from-blue-700 to-blue-900 px-8 py-8 text-white text-center">
          <Image
            src="/logo-coachlab.png"
            alt="CoachLab"
            width={140}
            height={40}
            className="mx-auto mb-5 object-contain"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <h2 className="text-xl font-bold">{quizTitle}</h2>
        </div>

        {/* Metadati */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
          <div className="px-4 py-5 text-center">
            <p className="text-2xl font-bold text-gray-900">{libraryMode ? questionCount : displayQuestions.length}</p>
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

        {/* Regole della prova */}
        <div className="px-8 py-5">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Regole della prova</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold flex-shrink-0">•</span>
              <span>Le domande e le risposte sono in <strong>ordine casuale</strong> e diverse per ogni studente.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold flex-shrink-0">•</span>
              <span>Vedrai <strong>una domanda alla volta</strong>. Puoi navigare avanti e indietro e modificare le risposte fino all&apos;invio.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold flex-shrink-0">•</span>
              <span>Il timer di <strong>{timerMinutes} minuti</strong> parte appena visualizzi la prima domanda.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold flex-shrink-0">•</span>
              <span>Servono almeno <strong>{passingScore} punti</strong> per superare la prova.</span>
            </li>
            {penaltyWrong && (
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold flex-shrink-0">•</span>
                <span>Risposta corretta <strong>+1</strong> · risposta sbagliata <strong>−1</strong> · non risposta <strong>0</strong>.</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold flex-shrink-0">•</span>
              <span>Una volta inviate, <strong>le risposte non sono più modificabili</strong> e la prova è conclusa.</span>
            </li>
          </ul>

          {instructions && (
            <div className="mt-4 bg-blue-50 rounded-xl p-4">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1.5">Istruzioni del docente</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{instructions}</p>
            </div>
          )}
        </div>

        {/* Conferma + Avvio */}
        <div className="px-8 pb-8 space-y-4 border-t border-gray-100 pt-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="mt-0.5 flex-shrink-0 w-4 h-4 accent-blue-600 cursor-pointer"
            />
            <span className="text-sm text-gray-700 select-none">
              Ho letto e compreso le regole. Sono pronto/a a iniziare.
            </span>
          </label>
          {startError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertTriangle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{startError}</p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={beginQuiz}
              disabled={!confirmed || startLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#1EB8E5' }}
            >
              {startLoading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
              {startLoading ? 'Preparazione…' : 'Inizia la prova'}
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

  const currentQuestion = displayQuestions[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === displayQuestions.length - 1

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
            {answeredCount}/{displayQuestions.length} risposte date
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
              Hai ancora {formatTime(graceLeft)} di tempo aggiuntivo per completare e consegnare.
              Passato questo limite la prova verrà consegnata automaticamente.
            </p>
          </div>
        </div>
      )}

      {/* Navigatore domande */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Domande</p>
        <div className="flex flex-wrap gap-2">
          {displayQuestions.map((q, i) => {
            const isAnswered = !!answers[q.id]
            const isCurrent = i === currentIndex
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={`w-9 h-9 rounded-lg text-sm font-bold transition border-2 ${
                  isCurrent
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : isAnswered
                      ? 'border-green-300 bg-green-50 text-green-700 hover:border-green-400'
                      : 'border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300'
                }`}
                title={isAnswered ? 'Risposta data' : 'Senza risposta'}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
      </div>

      {/* Domanda corrente */}
      {currentQuestion && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2">
            Domanda {currentIndex + 1} di {displayQuestions.length}
          </p>
          <p className="text-base font-semibold text-gray-900 mb-5">{currentQuestion.text}</p>
          <div className="space-y-2.5">
            {currentQuestion.quiz_options.map(opt => {
              const selected = answers[currentQuestion.id] === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => selectAnswer(currentQuestion.id, opt.id)}
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
      )}

      {/* Navigazione avanti/indietro + invio */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
          disabled={isFirst}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={15} /> Indietro
        </button>

        {isLast ? (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
            style={{ backgroundColor: '#1EB8E5' }}
          >
            <Send size={15} /> Concludi e invia
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex(i => Math.min(displayQuestions.length - 1, i + 1))}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white hover:opacity-90 transition"
            style={{ backgroundColor: '#1EB8E5' }}
          >
            Avanti <ChevronRight size={15} />
          </button>
        )}
      </div>

      {/* Pulsante invio sempre disponibile (non solo ultima domanda) */}
      {!isLast && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
            className="text-xs text-gray-400 hover:text-blue-600 hover:underline transition"
          >
            Concludi e invia ora →
          </button>
        </div>
      )}

      {/* Modale conferma invio */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <h3 className="text-base font-bold text-gray-900">Confermi l&apos;invio?</h3>
              </div>
              <button
                onClick={() => setShowConfirm(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-gray-700 leading-relaxed">
                Una volta inviate, <strong>le risposte non potranno più essere modificate</strong> e la prova sarà conclusa.
              </p>
              {unansweredCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                  Hai <strong>{unansweredCount} domand{unansweredCount === 1 ? 'a' : 'e'} senza risposta</strong>.
                  {penaltyWrong ? ' Le domande non risposte valgono 0 punti.' : ''}
                </div>
              )}
              <p className="text-xs text-gray-400">
                {answeredCount} risposte date su {displayQuestions.length} domande.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
              >
                Torna alla prova
              </button>
              <button
                onClick={() => { setShowConfirm(false); handleSubmit(false) }}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
                style={{ backgroundColor: '#1EB8E5' }}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Invia definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
