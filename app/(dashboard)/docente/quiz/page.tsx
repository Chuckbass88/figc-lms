import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClipboardCheck, Users, CheckCircle, XCircle, AlertTriangle, BookOpen } from 'lucide-react'

export default async function DocenteQuizGlobale() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myCoursesData } = await supabase
    .from('course_instructors')
    .select('course_id, courses(id, name)')
    .eq('instructor_id', user.id)

  const courseMap = new Map<string, string>()
  for (const r of myCoursesData ?? []) {
    const c = r.courses as unknown as { id: string; name: string } | null
    if (c) courseMap.set(c.id, c.name)
  }
  const courseIds = [...courseMap.keys()]

  const [{ data: quizzes }, { data: enrollments }] = await Promise.all([
    courseIds.length > 0
      ? supabase
          .from('course_quizzes')
          .select('id, title, passing_score, course_id, group_id, created_at, course_groups(name)')
          .in('course_id', courseIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    courseIds.length > 0
      ? supabase
          .from('course_enrollments')
          .select('course_id, student_id')
          .in('course_id', courseIds)
          .eq('status', 'active')
      : Promise.resolve({ data: [] }),
  ])

  const quizIds = (quizzes ?? []).map(q => q.id)
  const { data: attempts } = quizIds.length > 0
    ? await supabase
        .from('quiz_attempts')
        .select('quiz_id, passed')
        .in('quiz_id', quizIds)
    : { data: [] }

  const enrollByCourse = new Map<string, number>()
  for (const e of enrollments ?? []) {
    enrollByCourse.set(e.course_id, (enrollByCourse.get(e.course_id) ?? 0) + 1)
  }

  type AttemptRow = { quiz_id: string; passed: boolean }
  const statsByQuiz = new Map<string, { total: number; passed: number }>()
  for (const a of attempts as AttemptRow[] ?? []) {
    if (!statsByQuiz.has(a.quiz_id)) statsByQuiz.set(a.quiz_id, { total: 0, passed: 0 })
    const s = statsByQuiz.get(a.quiz_id)!
    s.total++
    if (a.passed) s.passed++
  }

  type Quiz = {
    id: string; title: string; passing_score: number; course_id: string
    group_id: string | null; course_groups: { name: string } | null
  }
  const allQuizzes = quizzes as unknown as Quiz[] ?? []

  const totalPending = allQuizzes.reduce((sum, q) => {
    const s = statsByQuiz.get(q.id) ?? { total: 0, passed: 0 }
    const enrolled = enrollByCourse.get(q.course_id) ?? 0
    return sum + Math.max(0, enrolled - s.total)
  }, 0)

  // Raggruppa per corso
  const quizzesByCourse = new Map<string, Quiz[]>()
  for (const q of allQuizzes) {
    if (!quizzesByCourse.has(q.course_id)) quizzesByCourse.set(q.course_id, [])
    quizzesByCourse.get(q.course_id)!.push(q)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">I Miei Quiz</h2>
        <p className="text-gray-500 text-sm mt-1">
          {allQuizzes.length} quiz su {courseIds.length} {courseIds.length === 1 ? 'corso' : 'corsi'}
          {totalPending > 0 && (
            <span className="text-amber-500 font-semibold"> · {totalPending} completamenti in attesa</span>
          )}
        </p>
      </div>

      {allQuizzes.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ClipboardCheck size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nessun quiz creato</p>
          <p className="text-gray-400 text-sm mt-1">Vai in un corso per creare il primo quiz.</p>
          <Link href="/docente/corsi" className="text-sm text-blue-600 hover:underline mt-3 inline-block">
            Vai ai miei corsi →
          </Link>
        </div>
      )}

      {[...quizzesByCourse.entries()].map(([courseId, courseQuizzes]) => {
        const courseName = courseMap.get(courseId) ?? 'Corso'
        const enrolled = enrollByCourse.get(courseId) ?? 0
        return (
          <div key={courseId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
              <BookOpen size={14} className="text-blue-600 flex-shrink-0" />
              <Link
                href={`/docente/corsi/${courseId}`}
                className="font-semibold text-gray-900 text-sm hover:text-blue-700 transition flex-1 min-w-0 truncate"
              >
                {courseName}
              </Link>
              <span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                <Users size={11} /> {enrolled}
              </span>
              <Link
                href={`/docente/corsi/${courseId}/quiz`}
                className="text-xs text-blue-600 hover:underline ml-2 flex-shrink-0"
              >
                Gestisci →
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {courseQuizzes.map(quiz => {
                const stats = statsByQuiz.get(quiz.id) ?? { total: 0, passed: 0 }
                const group = quiz.course_groups as { name: string } | null
                const pending = Math.max(0, enrolled - stats.total)
                const failed = stats.total - stats.passed

                return (
                  <Link
                    key={quiz.id}
                    href={`/docente/corsi/${courseId}/quiz/${quiz.id}`}
                    className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition group"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-50">
                      <ClipboardCheck size={16} className="text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition truncate">
                          {quiz.title}
                        </p>
                        {group && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700 flex-shrink-0">
                            {group.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Soglia: {quiz.passing_score}%</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Users size={10} /> {stats.total}/{enrolled} completati
                        </span>
                        {stats.passed > 0 && (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle size={10} /> {stats.passed} superati
                          </span>
                        )}
                        {failed > 0 && (
                          <span className="flex items-center gap-1 text-xs text-red-500">
                            <XCircle size={10} /> {failed} non superati
                          </span>
                        )}
                      </div>
                    </div>
                    {pending > 0 && (
                      <span className="flex-shrink-0 self-center flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                        <AlertTriangle size={10} /> {pending} da completare
                      </span>
                    )}
                    {pending === 0 && stats.total > 0 && (
                      <span className="flex-shrink-0 self-center text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle size={10} /> Tutti completati
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
