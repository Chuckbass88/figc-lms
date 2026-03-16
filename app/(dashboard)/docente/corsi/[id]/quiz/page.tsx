import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, ClipboardCheck, Users, CheckCircle, XCircle } from 'lucide-react'
import NuovoQuizForm from './NuovoQuizForm'

export default async function DocenteQuizListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: isInstructor } = await supabase
    .from('course_instructors')
    .select('instructor_id')
    .eq('course_id', id)
    .eq('instructor_id', user.id)
    .single()
  if (!isInstructor) notFound()

  const [
    { data: course },
    { data: quizzes },
    { data: groups },
    { count: enrolledCount },
  ] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', id).single(),
    supabase.from('course_quizzes')
      .select('id, title, description, passing_score, created_at, group_id, course_groups(name)')
      .eq('course_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('course_groups').select('id, name').eq('course_id', id),
    supabase.from('course_enrollments').select('*', { count: 'exact', head: true }).eq('course_id', id).eq('status', 'active'),
  ])

  if (!course) notFound()

  // Fetch attempts count and pass rate per quiz
  const quizIds = (quizzes ?? []).map(q => q.id)
  const { data: attempts } = quizIds.length > 0
    ? await supabase.from('quiz_attempts').select('quiz_id, passed').in('quiz_id', quizIds)
    : { data: [] }

  const attemptsByQuiz: Record<string, { total: number; passed: number }> = {}
  for (const a of attempts ?? []) {
    if (!attemptsByQuiz[a.quiz_id]) attemptsByQuiz[a.quiz_id] = { total: 0, passed: 0 }
    attemptsByQuiz[a.quiz_id].total++
    if (a.passed) attemptsByQuiz[a.quiz_id].passed++
  }

  type Quiz = {
    id: string; title: string; description: string | null
    passing_score: number; created_at: string; group_id: string | null
    course_groups: { name: string } | null
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href={`/docente/corsi/${id}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
        >
          <ArrowLeft size={15} /> {course.name}
        </Link>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={18} className="text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Quiz del corso</h2>
            {quizzes && quizzes.length > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                {quizzes.length}
              </span>
            )}
          </div>
          <NuovoQuizForm courseId={id} groups={groups ?? []} />
        </div>
      </div>

      <div className="space-y-3">
        {(quizzes as unknown as Quiz[] ?? []).map(quiz => {
          const stats = attemptsByQuiz[quiz.id] ?? { total: 0, passed: 0 }
          const group = quiz.course_groups
          return (
            <Link
              key={quiz.id}
              href={`/docente/corsi/${id}/quiz/${quiz.id}`}
              className="block bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-blue-300 transition group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition">{quiz.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${group ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                      {group ? group.name : 'Tutto il corso'}
                    </span>
                  </div>
                  {quiz.description && (
                    <p className="text-xs text-gray-500 mb-2 truncate">{quiz.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>Soglia: {quiz.passing_score}%</span>
                    <span className="flex items-center gap-1">
                      <Users size={11} /> {stats.total}/{enrolledCount ?? '—'} completati
                    </span>
                    {stats.total > 0 && (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <CheckCircle size={11} /> {stats.passed} superati
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0 text-right">
                  {new Date(quiz.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                </div>
              </div>
            </Link>
          )
        })}
        {(!quizzes || quizzes.length === 0) && (
          <div className="text-center py-16 text-gray-400">
            <ClipboardCheck size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nessun quiz creato.</p>
            <p className="text-xs mt-1">Crea il primo quiz per verificare le conoscenze dei corsisti.</p>
          </div>
        )}
      </div>
    </div>
  )
}
