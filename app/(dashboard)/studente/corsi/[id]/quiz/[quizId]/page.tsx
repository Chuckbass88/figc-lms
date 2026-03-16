import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import QuizRunner from './QuizRunner'

export default async function StudenteQuizPage({ params }: { params: Promise<{ id: string; quizId: string }> }) {
  const { id, quizId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: enrollment } = await supabase
    .from('course_enrollments')
    .select('status')
    .eq('course_id', id)
    .eq('student_id', user.id)
    .single()
  if (!enrollment) notFound()

  const [
    { data: course },
    { data: quiz },
    { data: attempt },
  ] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', id).single(),
    supabase.from('course_quizzes')
      .select('id, title, description, passing_score, quiz_questions(id, text, order_index, quiz_options(id, text, is_correct, order_index))')
      .eq('id', quizId)
      .eq('course_id', id)
      .single(),
    supabase.from('quiz_attempts')
      .select('id, score, total, passed, submitted_at')
      .eq('quiz_id', quizId)
      .eq('student_id', user.id)
      .maybeSingle(),
  ])

  if (!course || !quiz) notFound()

  type QuizOption = { id: string; text: string; is_correct: boolean; order_index: number }
  type Question = { id: string; text: string; order_index: number; quiz_options: QuizOption[] }

  const questions = ((quiz.quiz_questions as unknown as Question[]) ?? [])
    .sort((a, b) => a.order_index - b.order_index)
    .map(q => ({ ...q, quiz_options: q.quiz_options.sort((a, b) => a.order_index - b.order_index) }))

  const scorePct = attempt ? Math.round((attempt.score / attempt.total) * 100) : null

  // Se già completato, mostra risultato + riepilogo risposte
  if (attempt) {
    const { data: answers } = await supabase
      .from('quiz_answers')
      .select('question_id, option_id')
      .eq('attempt_id', attempt.id)

    const answerMap = new Map((answers ?? []).map(a => [a.question_id, a.option_id]))

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Link
            href={`/studente/corsi/${id}/quiz`}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
          >
            <ArrowLeft size={15} /> Quiz del corso
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">{quiz.title}</h2>
          {quiz.description && <p className="text-gray-500 text-sm mt-1">{quiz.description}</p>}
        </div>

        {/* Score card */}
        <div className={`rounded-2xl p-8 text-center ${attempt.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${attempt.passed ? 'bg-green-100' : 'bg-red-100'}`}>
            {attempt.passed
              ? <CheckCircle size={32} className="text-green-600" />
              : <XCircle size={32} className="text-red-500" />
            }
          </div>
          <p className={`text-3xl font-black mb-1 ${attempt.passed ? 'text-green-700' : 'text-red-600'}`}>
            {scorePct}%
          </p>
          <p className={`text-lg font-bold mb-2 ${attempt.passed ? 'text-green-800' : 'text-red-700'}`}>
            {attempt.passed ? 'Quiz superato!' : 'Quiz non superato'}
          </p>
          <p className="text-sm text-gray-600">
            {attempt.score} risposte corrette su {attempt.total} · Soglia richiesta: {quiz.passing_score}%
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Completato il {new Date(attempt.submitted_at).toLocaleDateString('it-IT', {
              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>

        {/* Riepilogo risposte */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Riepilogo risposte</h3>
            <p className="text-xs text-gray-400 mt-0.5">Verde = risposta corretta · Rosso = risposta errata</p>
          </div>
          <div className="divide-y divide-gray-50">
            {questions.map((q, qi) => {
              const selectedOptionId = answerMap.get(q.id)
              const selectedOption = q.quiz_options.find(o => o.id === selectedOptionId)
              const isCorrect = selectedOption?.is_correct ?? false
              return (
                <div key={q.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    {isCorrect
                      ? <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                      : <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{qi + 1}. {q.text}</p>
                      <div className="mt-2 space-y-1.5">
                        {q.quiz_options.map(opt => {
                          const isSelected = opt.id === selectedOptionId
                          const isCorrectOpt = opt.is_correct
                          return (
                            <p
                              key={opt.id}
                              className={`text-xs flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${
                                isSelected && isCorrectOpt ? 'bg-green-50 text-green-700 font-semibold' :
                                isSelected && !isCorrectOpt ? 'bg-red-50 text-red-600 font-medium' :
                                isCorrectOpt ? 'text-green-700 font-medium' :
                                'text-gray-400'
                              }`}
                            >
                              {isSelected && isCorrectOpt && <CheckCircle size={11} className="flex-shrink-0" />}
                              {isSelected && !isCorrectOpt && <XCircle size={11} className="flex-shrink-0" />}
                              {!isSelected && isCorrectOpt && <CheckCircle size={11} className="flex-shrink-0 text-green-600" />}
                              {!isSelected && !isCorrectOpt && <span className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block flex-shrink-0" />}
                              <span>{opt.text}</span>
                              {isSelected && !isCorrectOpt && <span className="text-red-400 text-[10px]">(tua risposta)</span>}
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
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/studente/corsi/${id}/quiz`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
        >
          <ArrowLeft size={15} /> Quiz del corso
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">{quiz.title}</h2>
        {quiz.description && <p className="text-gray-500 text-sm mt-1">{quiz.description}</p>}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-gray-500">{questions.length} domande</span>
          <span className="text-xs text-gray-500">Punteggio minimo: {quiz.passing_score}%</span>
        </div>
      </div>

      <QuizRunner
        quizId={quizId}
        courseId={id}
        questions={questions}
        passingScore={quiz.passing_score}
      />
    </div>
  )
}
