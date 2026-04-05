import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClipboardCheck, Users, CheckCircle, XCircle, ChevronRight, Archive, Trash2 } from 'lucide-react'
import CreaQuizModal, { CourseForQuiz } from '@/components/quiz/CreaQuizModal'
import CreaTemplateModal from '@/components/quiz/CreaTemplateModal'
import AttivaTemplateModal from '@/components/quiz/AttivaTemplateModal'

export const dynamic = 'force-dynamic'

const CATEGORIE = ['Esame Finale', 'Verifica Intermedia', 'Esercitazione', 'Simulazione']

const categoryColors: Record<string, string> = {
  'Esame Finale':        'bg-red-100 text-red-700',
  'Verifica Intermedia': 'bg-amber-100 text-amber-700',
  'Esercitazione':       'bg-green-100 text-green-700',
  'Simulazione':         'bg-purple-100 text-purple-700',
}

export default async function AdminQuizPage({
  searchParams,
  basePath = '/super-admin/quiz',
}: {
  searchParams: Promise<{ categoria?: string }>
  basePath?: string
}) {
  const { categoria } = await searchParams
  const supabase = await createClient()

  const [
    { data: quizzes },
    { data: courses },
    { data: templates },
  ] = await Promise.all([
    supabase
      .from('course_quizzes')
      .select('id, title, description, passing_score, created_at, course_id, group_id, category, course_groups(name)')
      .order('created_at', { ascending: false }),
    supabase.from('courses').select('id, name, status').order('name'),
    supabase
      .from('quiz_templates')
      .select('id, title, description, category, course_tag, quiz_template_questions(id)')
      .order('created_at', { ascending: false }),
  ])

  const courseIds = [...new Set((quizzes ?? []).map(q => q.course_id))]

  // Fetch groups for CreaQuizModal
  const allCourseIds = (courses ?? []).filter(c => c.status === 'active').map(c => c.id)
  const { data: allGroupsData } = allCourseIds.length > 0
    ? await supabase.from('course_groups').select('id, name, course_id').in('course_id', allCourseIds)
    : { data: [] }

  const coursesForModal: CourseForQuiz[] = (courses ?? [])
    .filter(c => c.status === 'active')
    .map(c => ({
      id: c.id,
      name: c.name,
      groups: (allGroupsData ?? []).filter(g => g.course_id === c.id).map(g => ({ id: g.id, name: g.name })),
    }))

  const quizIds = (quizzes ?? []).map(q => q.id)

  const [{ data: attempts }, { data: enrollments }] = await Promise.all([
    quizIds.length > 0
      ? supabase.from('quiz_attempts').select('quiz_id, passed').in('quiz_id', quizIds)
      : Promise.resolve({ data: [] }),
    courseIds.length > 0
      ? supabase.from('course_enrollments').select('course_id, student_id').in('course_id', courseIds).eq('status', 'active')
      : Promise.resolve({ data: [] }),
  ])

  const activeCourseIds = new Set((courses ?? []).filter(c => c.status === 'active').map(c => c.id))
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
    group_id: string | null; category: string | null; course_groups: { name: string } | null
  }
  type TemplateRow = { id: string; title: string; description: string | null; category: string | null; course_tag: string | null; quiz_template_questions: { id: string }[] }
  const templateList = (templates as unknown as TemplateRow[] ?? []).map(t => ({ ...t, _count: t.quiz_template_questions?.length ?? 0 }))

  let allQuizzes = quizzes as unknown as QuizRow[] ?? []
  const totalQuizzesAll = allQuizzes.length

  if (categoria && CATEGORIE.includes(categoria)) {
    allQuizzes = allQuizzes.filter(q => q.category === categoria)
  }

  const quizzesByCourse = new Map<string, QuizRow[]>()
  for (const q of allQuizzes) {
    if (!quizzesByCourse.has(q.course_id)) quizzesByCourse.set(q.course_id, [])
    quizzesByCourse.get(q.course_id)!.push(q)
  }

  const totalAttempts = attempts?.length ?? 0
  const totalPassed = (attempts as AttemptRow[] ?? []).filter(a => a.passed).length
  const passRate = totalAttempts > 0 ? Math.round((totalPassed / totalAttempts) * 100) : null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Panoramica Quiz</h2>
          <p className="text-gray-500 text-sm mt-1">
            {totalQuizzesAll} quiz · {totalAttempts} tentativi · {passRate !== null ? `${passRate}% superati` : 'nessun tentativo'}
          </p>
        </div>
        {coursesForModal.length > 0 && (
          <CreaQuizModal courses={coursesForModal} label="Crea quiz" />
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-gray-900">{totalQuizzesAll}</p>
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

      {/* Filtri per categoria */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={basePath}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${!categoria ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Tutti
        </Link>
        {CATEGORIE.map(cat => (
          <Link
            key={cat}
            href={`${basePath}?categoria=${encodeURIComponent(cat)}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${categoria === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {cat}
          </Link>
        ))}
      </div>

      {/* Paniere — Quiz pre-archiviati */}
      <div className="bg-white rounded-xl border border-indigo-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-indigo-100 flex items-center gap-3 bg-indigo-50">
          <Archive size={15} className="text-indigo-600" />
          <h3 className="font-semibold text-gray-900 text-sm flex-1">Quiz pre-archiviati</h3>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{templateList.length}</span>
          <CreaTemplateModal />
        </div>
        {templateList.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">
            Nessun quiz pre-archiviato. Crea un quiz base da riutilizzare nei corsi.
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {templateList.map(tpl => (
              <div key={tpl.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{tpl.title}</p>
                    {tpl.course_tag && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">{tpl.course_tag}</span>
                    )}
                    {tpl.category && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[tpl.category] ?? 'bg-gray-100 text-gray-600'}`}>
                        {tpl.category}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{tpl._count} domande</span>
                  </div>
                  {tpl.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{tpl.description}</p>}
                </div>
                {coursesForModal.length > 0 && (
                  <AttivaTemplateModal template={tpl} courses={coursesForModal} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quiz per corso */}
      {[...quizzesByCourse.entries()].filter(([courseId]) => activeCourseIds.has(courseId)).map(([courseId, courseQuizzes]) => {
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
                        {quiz.category && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${categoryColors[quiz.category] ?? 'bg-gray-100 text-gray-600'}`}>
                            {quiz.category}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${group ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                          {group ? group.name : 'Tutto il corso'}
                        </span>
                      </div>
                      {quiz.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{quiz.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">Voto min: {quiz.passing_score} pt</p>
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition hover:opacity-90 flex-shrink-0"
                      style={{ backgroundColor: '#1565C0' }}
                    >
                      Apri quiz
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {totalQuizzesAll === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ClipboardCheck size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nessun quiz creato</p>
          <p className="text-gray-400 text-sm mt-1">Crea il primo quiz usando il pulsante in alto a destra.</p>
        </div>
      )}

      {totalQuizzesAll > 0 && allQuizzes.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">Nessun quiz con tipologia <strong>{categoria}</strong>.</p>
        </div>
      )}
    </div>
  )
}
