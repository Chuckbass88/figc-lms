import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import DomandeClient from './DomandeClient'

type Question = {
  id: string
  text: string
  order_index: number
  points: number
  quiz_options: { id: string; text: string; is_correct: boolean; order_index: number }[]
}

export default async function GestioneDomandeQuizPage({ params }: { params: Promise<{ id: string; quizId: string }> }) {
  const { id, quizId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isSuperAdmin = profile?.role === 'super_admin'

  if (!isSuperAdmin) {
    const { data: isInstructor } = await supabase
      .from('course_instructors')
      .select('instructor_id')
      .eq('course_id', id)
      .eq('instructor_id', user.id)
      .single()
    if (!isInstructor) notFound()
  }

  const [{ data: course }, { data: quiz }] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', id).single(),
    supabase.from('course_quizzes')
      .select('id, title, quiz_questions(id, text, order_index, points, quiz_options(id, text, is_correct, order_index))')
      .eq('id', quizId)
      .eq('course_id', id)
      .single(),
  ])

  if (!course || !quiz) notFound()

  const questions = ((quiz.quiz_questions as unknown as Question[]) ?? [])
    .sort((a, b) => a.order_index - b.order_index)
    .map(q => ({
      ...q,
      quiz_options: q.quiz_options.sort((a, b) => a.order_index - b.order_index),
    }))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href={`/docente/corsi/${id}/quiz/${quizId}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
        >
          <ArrowLeft size={15} /> {quiz.title}
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Gestione Domande</h2>
        <p className="text-gray-500 text-sm mt-1">{quiz.title}</p>
      </div>

      <DomandeClient quizId={quizId} initialQuestions={questions} />
    </div>
  )
}
