import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, CheckCircle, Lock, Clock } from 'lucide-react'
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
      .select('id, title, description, passing_score, timer_minutes, instructions, shuffle_questions, available_from, available_until, auto_close_on_timer, penalty_wrong, questions_per_student, quiz_questions(id, text, order_index, quiz_options(id, text, is_correct, order_index))')
      .eq('id', quizId)
      .eq('course_id', id)
      .single(),
    supabase.from('quiz_attempts')
      .select('id, submitted_at, started_at')
      .eq('quiz_id', quizId)
      .eq('student_id', user.id)
      .maybeSingle(),
  ])

  if (!course || !quiz) notFound()

  type QuizMeta = {
    timer_minutes: number
    instructions: string | null
    shuffle_questions: boolean
    available_from: string | null
    available_until: string | null
    auto_close_on_timer: boolean
    penalty_wrong: boolean | null
    questions_per_student: number | null
  }
  const quizMeta = quiz as unknown as QuizMeta

  // Check availability window
  const now = new Date()
  if (quizMeta.available_from && new Date(quizMeta.available_from) > now) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Link href={`/studente/corsi/${id}/quiz`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit">
            <ArrowLeft size={15} /> Quiz del corso
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">{quiz.title}</h2>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-10 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <Clock size={32} className="text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Quiz non ancora disponibile</h3>
          <p className="text-sm text-gray-500">
            Questo quiz sarà disponibile dal{' '}
            {new Date(quizMeta.available_from).toLocaleDateString('it-IT', {
              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    )
  }

  if (quizMeta.available_until && new Date(quizMeta.available_until) < now) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Link href={`/studente/corsi/${id}/quiz`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit">
            <ArrowLeft size={15} /> Quiz del corso
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">{quiz.title}</h2>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-10 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
            <Lock size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Quiz chiuso</h3>
          <p className="text-sm text-gray-500">
            La finestra di consegna per questo quiz è scaduta il{' '}
            {new Date(quizMeta.available_until).toLocaleDateString('it-IT', {
              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    )
  }

  type QuizOption = { id: string; text: string; is_correct: boolean; order_index: number }
  type Question = { id: string; text: string; order_index: number; quiz_options: QuizOption[] }

  let questions = ((quiz.quiz_questions as unknown as Question[]) ?? [])
    .sort((a, b) => a.order_index - b.order_index)
    .map(q => ({ ...q, quiz_options: q.quiz_options.sort((a, b) => a.order_index - b.order_index) }))

  // Always shuffle for pool-based quizzes; otherwise respect shuffle_questions flag
  if (quizMeta.questions_per_student || quizMeta.shuffle_questions) {
    questions = [...questions].sort(() => Math.random() - 0.5)
  }

  // Pool mode: pick only N questions per student
  if (quizMeta.questions_per_student && quizMeta.questions_per_student < questions.length) {
    questions = questions.slice(0, quizMeta.questions_per_student)
  }

  // Se già completato, mostra schermata neutra senza risultati
  if (attempt) {
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
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-10 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Quiz già consegnato</h3>
          <p className="text-sm text-gray-500">
            Hai completato questo quiz il{' '}
            {new Date(attempt.submitted_at).toLocaleDateString('it-IT', {
              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
          <p className="text-xs text-gray-400">Il docente analizzerà i risultati.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link
        href={`/studente/corsi/${id}/quiz`}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition w-fit"
      >
        <ArrowLeft size={15} /> Quiz del corso
      </Link>

      <QuizRunner
        quizId={quizId}
        courseId={id}
        quizTitle={quiz.title}
        questions={questions}
        passingScore={quiz.passing_score}
        timerMinutes={quizMeta.timer_minutes ?? 30}
        instructions={quizMeta.instructions ?? null}
        autoCloseOnTimer={quizMeta.auto_close_on_timer ?? true}
        penaltyWrong={quizMeta.penalty_wrong ?? false}
      />
    </div>
  )
}
