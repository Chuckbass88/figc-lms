import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, ClipboardCheck, CheckCircle, XCircle, Clock } from 'lucide-react'

export default async function StudenteQuizListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const { data: course } = await supabase.from('courses').select('id, name').eq('id', id).single()
  if (!course) notFound()

  // Trova i gruppi dello studente SOLO in questo corso (due step per evitare join mancante)
  const { data: courseGroups } = await supabase
    .from('course_groups')
    .select('id')
    .eq('course_id', id)

  const courseGroupIds = (courseGroups ?? []).map(g => g.id)

  const { data: myGroupMember } = courseGroupIds.length > 0
    ? await supabase
        .from('course_group_members')
        .select('group_id')
        .eq('student_id', user.id)
        .in('group_id', courseGroupIds)
    : { data: [] }

  const myGroupIds = (myGroupMember ?? []).map(m => m.group_id)

  // Quiz visibili allo studente: group_id NULL oppure group_id nei propri gruppi
  const { data: allQuizzes } = await supabase
    .from('course_quizzes')
    .select('id, title, description, passing_score, created_at, group_id')
    .eq('course_id', id)
    .order('created_at', { ascending: false })

  const visibleQuizzes = (allQuizzes ?? []).filter(q =>
    q.group_id === null || myGroupIds.includes(q.group_id)
  )

  // Tentativi dello studente
  const quizIds = visibleQuizzes.map(q => q.id)
  const { data: myAttempts } = quizIds.length > 0
    ? await supabase
        .from('quiz_attempts')
        .select('quiz_id, score, total, passed, submitted_at')
        .eq('student_id', user.id)
        .in('quiz_id', quizIds)
    : { data: [] }

  const attemptMap = new Map((myAttempts ?? []).map(a => [a.quiz_id, a]))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/studente/corsi/${id}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
        >
          <ArrowLeft size={15} /> {course.name}
        </Link>
        <div className="flex items-center gap-2">
          <ClipboardCheck size={18} className="text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Quiz del corso</h2>
          {visibleQuizzes.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
              {visibleQuizzes.length}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {visibleQuizzes.map(quiz => {
          const attempt = attemptMap.get(quiz.id)
          const scorePct = attempt ? Math.round((attempt.score / attempt.total) * 100) : null
          return (
            <Link
              key={quiz.id}
              href={`/studente/corsi/${id}/quiz/${quiz.id}`}
              className="block bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-blue-300 transition group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition">{quiz.title}</p>
                  {quiz.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{quiz.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Soglia superamento: {quiz.passing_score}%</p>
                </div>
                <div className="flex-shrink-0">
                  {attempt ? (
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${attempt.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {attempt.passed ? <CheckCircle size={11} /> : <XCircle size={11} />}
                        {attempt.passed ? 'Superato' : 'Non superato'}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{scorePct}% · {attempt.score}/{attempt.total}</p>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                      <Clock size={11} /> Da svolgere
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
        {visibleQuizzes.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <ClipboardCheck size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nessun quiz assegnato.</p>
          </div>
        )}
      </div>
    </div>
  )
}
