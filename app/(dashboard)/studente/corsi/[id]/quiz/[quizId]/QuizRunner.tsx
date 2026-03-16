'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Loader2, Send } from 'lucide-react'

interface Option { id: string; text: string; is_correct: boolean; order_index: number }
interface Question { id: string; text: string; order_index: number; quiz_options: Option[] }

interface Props {
  quizId: string
  courseId: string
  questions: Question[]
  passingScore: number
}

export default function QuizRunner({ quizId, courseId, questions, passingScore }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; total: number; scorePct: number; passed: boolean } | null>(null)

  function selectAnswer(questionId: string, optionId: string) {
    if (result) return
    setAnswers(prev => ({ ...prev, [questionId]: optionId }))
  }

  const allAnswered = questions.every(q => answers[q.id])

  async function submit() {
    if (!allAnswered || submitting) return
    setSubmitting(true)
    const res = await fetch(`/api/quiz/${quizId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (data.ok) setResult(data)
  }

  if (result) {
    return (
      <div className="space-y-6">
        {/* Risultato */}
        <div className={`rounded-2xl p-8 text-center ${result.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${result.passed ? 'bg-green-100' : 'bg-red-100'}`}>
            {result.passed
              ? <CheckCircle size={32} className="text-green-600" />
              : <XCircle size={32} className="text-red-500" />
            }
          </div>
          <p className={`text-3xl font-black mb-1 ${result.passed ? 'text-green-700' : 'text-red-600'}`}>
            {result.scorePct}%
          </p>
          <p className={`text-lg font-bold mb-2 ${result.passed ? 'text-green-800' : 'text-red-700'}`}>
            {result.passed ? 'Quiz superato!' : 'Quiz non superato'}
          </p>
          <p className="text-sm text-gray-600">
            {result.score} risposte corrette su {result.total} · Soglia richiesta: {passingScore}%
          </p>
        </div>

        {/* Riepilogo risposte */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Riepilogo risposte</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {questions.map((q, qi) => {
              const selectedId = answers[q.id]
              const selected = q.quiz_options.find(o => o.id === selectedId)
              const correct = q.quiz_options.find(o => o.is_correct)
              const isRight = selectedId === correct?.id
              return (
                <div key={q.id} className="px-5 py-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">{qi + 1}. {q.text}</p>
                  <div className="space-y-1 ml-4">
                    {q.quiz_options.sort((a, b) => a.order_index - b.order_index).map(opt => {
                      const isSelected = opt.id === selectedId
                      const isCorrect = opt.is_correct
                      let style = 'text-gray-500 text-xs'
                      if (isSelected && isCorrect) style = 'text-green-700 text-xs font-semibold'
                      else if (isSelected && !isCorrect) style = 'text-red-600 text-xs font-semibold'
                      else if (!isSelected && isCorrect) style = 'text-green-600 text-xs'
                      return (
                        <p key={opt.id} className={`flex items-center gap-1.5 ${style}`}>
                          {isSelected && isCorrect && <CheckCircle size={11} className="text-green-600" />}
                          {isSelected && !isCorrect && <XCircle size={11} className="text-red-500" />}
                          {!isSelected && isCorrect && <CheckCircle size={11} className="text-green-400" />}
                          {!isSelected && !isCorrect && <span className="w-2.5 h-2.5 rounded-full border border-gray-200 inline-block flex-shrink-0" />}
                          {opt.text}
                          {!isSelected && isCorrect && <span className="text-green-500">(risposta corretta)</span>}
                        </p>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="text-center">
          <a href={`/studente/corsi/${courseId}/quiz`} className="text-sm text-blue-600 hover:underline">
            ← Torna alla lista quiz
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {questions.map((q, qi) => (
        <div key={q.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">{qi + 1}. {q.text}</p>
          <div className="space-y-2">
            {q.quiz_options.sort((a, b) => a.order_index - b.order_index).map(opt => {
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

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {Object.keys(answers).length}/{questions.length} domande risposte
        </p>
        <button
          onClick={submit}
          disabled={!allAnswered || submitting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
          style={{ backgroundColor: '#003DA5' }}
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          Invia risposte
        </button>
      </div>
    </div>
  )
}
