import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClipboardCheck, Users, CheckCircle, XCircle, ArrowRight } from 'lucide-react'

export default async function AdminQuizPage() {
  const supabase = await createClient()

  const [
    { data: quizzes },
    { data: courses },
  ] = await Promise.all([
    supabase
      .from('course_quizzes')
      .select('id, title, description, passing_score, created_at, course_id, group_id, course_groups(name)')
      .order('created_at', { ascending: false }),
    supabase.from('courses').select('id, name').order('name'),
  ])

  const quizIds = (quizzes ?? []).map(q => q.id)
  const courseIds = [...new Set((quizzes ?? []).map(q => q.course_id))]

  const [{ data: attempts }, { data: enrollments }] = await Promise.all([
    quizIds.length > 0
      ? supabase.from('quiz_attempts').select('quiz_id, passed').in('quiz_id', quizIds)
      : Promise.resolve({ data: [] }),
    courseIds.length > 0
      ? supabase.from('course_enrollments').select('course_id, student_id').in('course_id', courseIds).eq('status', 'active')
      : Promise.resolve({ data: [] }),
  ])

  const courseNameMap = new Map((courses ?? []).map(c => [c.id, c.name]))
  const enrollByCourse = new Map<string, number>()
  for (const e of enrollments ?? []) {
    enrollByCourse.set(e.course_id, (enrollByCourse.get(e.course_id) ?? 0) + 1)
  }

  type AttemptRow = { quiz_id: string; passed: boolean }
  const attemptsByQuiz = new Map<string, { total: number; passed: number }>()
  for (const a of attempts as AttemptRow[] ?? []) {
    if (!attemptsByQuiz.has(a.quiz_id)) attemptsByQuiz.set(a.quiz_id, { total: 0, passed: 0 })
    const s = attemptsByQuiz.get(a.quiz_id)!
    s.total++
    if (a.passed) s.passed++
  }

  type QuizRow = {
    id: string; title: string; description: string | null
    passing_score: number; created_at: string; course_id: string
    group_id: string | null; course_groups: { name: string } | null
  }

  const quizzesByCourse = new Map<string, QuizRow[]>()
  for (const q of quizzes as unknown as QuizRow[] ?? []) {
    if (!quizzesByCourse.has(q.course_id)) quizzesByCourse.set(q.course_id, [])
    quizzesByCourse.get(q.course_id)!.push(q)
  }

  const totalQuizzes = quizzes?.length ?? 0
  const totalAttempts = attempts?.length ?? 0
  const totalPassed = (attempts as AttemptRow[] ?? []).filter(a => a.passed).length
  const passRate = totalAttempts > 0 ? Math.round((totalPassed / totalAttempts) * 100) : null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Panoramica Quiz</h2>
        <p className="text-gray-500 text-sm mt-1">
          {totalQuizzes} quiz · {totalAttempts} tentativi · {passRate !== null ? `${passRate}% superati` : 'nessun tentativo'}
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-gray-900">{totalQuizzes}</p>
          <p className="text-sm text-gray-500 font-medium mt-1">Quiz totali</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-blue-700">{totalAttempts}</p>
          <p className="text-sm text-gray-500 font-medium mt-1">Tentativi completati</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
          <p className={`text-3xl font-bold ${passRate !== null && passRate >= 60 ? 'text-green-700' : passRate !== null ? 'text-amber-600' : 'text-gray-400'}`}>
            {passRate !== null ? `${passRate}%` : '—'}
          </p>
          <p className="text-sm text-gray-500 font-medium mt-1">% superati ({totalPassed})</p>
        </div>
      </div>

      {/* Quiz per corso */}
      {[...quizzesByCourse.entries()].map(([courseId, courseQuizzes]) => {
        const courseName = courseNameMap.get(courseId) ?? 'Corso sconosciuto'
        const studentCount = enrollByCourse.get(courseId) ?? 0
        return (
          <div key={courseId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/super-admin/corsi/${courseId}`}
                  className="font-semibold text-gray-900 text-sm hover:text-blue-700 transition"
                >
                  {courseName}
                </Link>
              </div>
              <span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                <Users size={11} /> {studentCount} corsisti
              </span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                {courseQuizzes.length} quiz
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {courseQuizzes.map(quiz => {
                const stats = attemptsByQuiz.get(quiz.id) ?? { total: 0, passed: 0 }
                const group = quiz.course_groups as { name: string } | null
                const pct = studentCount > 0 ? Math.round((stats.total / studentCount) * 100) : 0
                return (
                  <div key={quiz.id} className="px-5 py-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{quiz.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${group ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                          {group ? group.name : 'Tutto il corso'}
                        </span>
                      </div>
                      {quiz.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{quiz.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">Soglia: {quiz.passing_score}%</p>
                      {/* Progress bar completamento */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                          <div
                            className={`h-full rounded-full ${pct >= 75 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-400' : 'bg-gray-300'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{stats.total}/{studentCount} completati</span>
                        {stats.total > 0 && (
                          <>
                            <span className="text-xs text-green-600 flex items-center gap-0.5">
                              <CheckCircle size={10} /> {stats.passed}
                            </span>
                            {stats.total - stats.passed > 0 && (
                              <span className="text-xs text-red-500 flex items-center gap-0.5">
                                <XCircle size={10} /> {stats.total - stats.passed}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/super-admin/corsi/${courseId}/quiz/${quiz.id}`}
                      className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-700 transition flex-shrink-0"
                      title="Apri dettaglio quiz"
                    >
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {(!quizzes || quizzes.length === 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ClipboardCheck size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nessun quiz creato</p>
          <p className="text-gray-400 text-sm mt-1">I docenti non hanno ancora creato quiz per i corsi.</p>
        </div>
      )}
    </div>
  )
}
