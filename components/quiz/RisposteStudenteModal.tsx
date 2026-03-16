'use client'

import { useState } from 'react'
import { Eye, X, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface QuizOption {
  id: string
  text: string
  is_correct: boolean
  order_index: number
}

interface Question {
  id: string
  text: string
  order_index: number
  quiz_options: QuizOption[]
}

interface Props {
  attemptId: string
  studentName: string
  score: number
  total: number
  passed: boolean
  questions: Question[]
}

export default function RisposteStudenteModal({ attemptId, studentName, score, total, passed, questions }: Props) {
  const [open, setOpen] = useState(false)
  const [answerMap, setAnswerMap] = useState<Map<string, string> | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleOpen() {
    if (answerMap) { setOpen(true); return }
    setLoading(true)
    const { data } = await supabase
      .from('quiz_answers')
      .select('question_id, option_id')
      .eq('attempt_id', attemptId)
    setAnswerMap(new Map((data ?? []).map(a => [a.question_id, a.option_id])))
    setLoading(false)
    setOpen(true)
  }

  const sortedQuestions = [...questions].sort((a, b) => a.order_index - b.order_index)

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={loading}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition disabled:opacity-50"
        title="Vedi risposte dettagliate"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
        Dettaglio
      </button>

      {open && answerMap && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-900">{studentName}</h3>
                <p className={`text-sm font-semibold mt-0.5 ${passed ? 'text-green-600' : 'text-red-500'}`}>
                  {score}/{total} risposte corrette · {passed ? 'Superato' : 'Non superato'}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={18} />
              </button>
            </div>

            {/* Domande */}
            <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
              {sortedQuestions.map((q, qi) => {
                const selectedOptionId = answerMap.get(q.id)
                const selectedOption = q.quiz_options.find(o => o.id === selectedOptionId)
                const isCorrect = selectedOption?.is_correct ?? false
                return (
                  <div key={q.id} className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      {isCorrect
                        ? <CheckCircle size={15} className="text-green-500 flex-shrink-0 mt-0.5" />
                        : <XCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{qi + 1}. {q.text}</p>
                        <div className="mt-1.5 space-y-1">
                          {q.quiz_options.sort((a, b) => a.order_index - b.order_index).map(opt => {
                            const isSelected = opt.id === selectedOptionId
                            const isCorrectOpt = opt.is_correct
                            return (
                              <p
                                key={opt.id}
                                className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded-lg ${
                                  isSelected && isCorrectOpt ? 'bg-green-50 text-green-700 font-semibold' :
                                  isSelected && !isCorrectOpt ? 'bg-red-50 text-red-600 font-medium' :
                                  isCorrectOpt ? 'text-green-700 font-medium' :
                                  'text-gray-400'
                                }`}
                              >
                                {isSelected && isCorrectOpt && <CheckCircle size={10} className="flex-shrink-0" />}
                                {isSelected && !isCorrectOpt && <XCircle size={10} className="flex-shrink-0" />}
                                {!isSelected && isCorrectOpt && <CheckCircle size={10} className="flex-shrink-0" />}
                                {!isSelected && !isCorrectOpt && <span className="w-2 h-2 rounded-full border border-gray-300 inline-block flex-shrink-0" />}
                                <span>{opt.text}</span>
                                {isSelected && !isCorrectOpt && <span className="text-red-400 text-[10px] ml-1">(risposta data)</span>}
                              </p>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
