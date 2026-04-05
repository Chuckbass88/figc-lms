import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Check, X, Minus, ClipboardList, ClipboardCheck } from 'lucide-react'
import InviaNotificaBtn from './InviaNotificaBtn'
import NotaPrivataEditor from './NotaPrivataEditor'

export default async function DettaglioCorsista({ params }: { params: Promise<{ id: string }> }) {
  const { id: studentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isSuperAdmin = profile?.role === 'super_admin'

  // Profilo dello studente
  const { data: student } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', studentId)
    .single()

  if (!student) notFound()

  let enrolledCourseIds: string[] = []
  let myCoursesData: { course_id: string; courses: unknown }[] = []

  if (isSuperAdmin) {
    // Admin: vede tutti i corsi dove il corsista è iscritto
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('course_id, courses(id, name)')
      .eq('student_id', studentId)
      .eq('status', 'active')
    enrolledCourseIds = (enrollments ?? []).map(e => e.course_id)
    myCoursesData = (enrollments ?? []) as { course_id: string; courses: unknown }[]
  } else {
    // Docente: solo corsi dove è istruttore
    const { data: instructorCourses } = await supabase
      .from('course_instructors')
      .select('course_id, courses(id, name)')
      .eq('instructor_id', user.id)
    myCoursesData = (instructorCourses ?? []) as { course_id: string; courses: unknown }[]
    const courseIds = myCoursesData.map(r => r.course_id)

    const { data: enrollments } = courseIds.length > 0
      ? await supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('student_id', studentId)
          .in('course_id', courseIds)
          .eq('status', 'active')
      : { data: [] }
    enrolledCourseIds = (enrollments ?? []).map(e => e.course_id)
  }

  if (enrolledCourseIds.length === 0) notFound()

  // Task per corso + consegne dello studente
  const { data: courseTasks } = enrolledCourseIds.length > 0
    ? await supabase
        .from('course_tasks')
        .select('id, title, course_id, due_date, group_id')
        .in('course_id', enrolledCourseIds)
    : { data: [] }

  const taskIds = (courseTasks ?? []).map(t => t.id)
  const { data: studentSubmissions } = taskIds.length > 0
    ? await supabase
        .from('task_submissions')
        .select('task_id, grade, submitted_at')
        .eq('student_id', studentId)
        .in('task_id', taskIds)
    : { data: [] }

  const submissionMap = new Map((studentSubmissions ?? []).map(s => [s.task_id, s]))

  // Quiz per corso + tentativi dello studente
  const { data: courseQuizzes } = enrolledCourseIds.length > 0
    ? await supabase
        .from('course_quizzes')
        .select('id, title, course_id, passing_score, group_id')
        .in('course_id', enrolledCourseIds)
    : { data: [] }

  const quizIds = (courseQuizzes ?? []).map(q => q.id)
  const { data: studentAttempts } = quizIds.length > 0
    ? await supabase
        .from('quiz_attempts')
        .select('quiz_id, score, total, passed')
        .eq('student_id', studentId)
        .in('quiz_id', quizIds)
    : { data: [] }

  const attemptMap = new Map((studentAttempts ?? []).map(a => [a.quiz_id, a]))

  type CourseQuiz = { id: string; title: string; course_id: string; passing_score: number; group_id: string | null }
  const quizzesByCourse: Record<string, CourseQuiz[]> = {}
  for (const q of courseQuizzes ?? []) {
    if (!quizzesByCourse[q.course_id]) quizzesByCourse[q.course_id] = []
    quizzesByCourse[q.course_id]!.push(q as CourseQuiz)
  }

  // Raggruppa task per corso
  type CourseTask = { id: string; title: string; course_id: string; due_date: string | null; group_id: string | null }
  const tasksByCourse: Record<string, CourseTask[]> = {}
  for (const t of courseTasks ?? []) {
    if (!tasksByCourse[t.course_id]) tasksByCourse[t.course_id] = []
    tasksByCourse[t.course_id]!.push(t as CourseTask)
  }

  // Note private del docente per questo studente
  const { data: myNotes } = enrolledCourseIds.length > 0
    ? await supabase
        .from('student_notes')
        .select('course_id, content')
        .eq('student_id', studentId)
        .eq('instructor_id', user.id)
        .in('course_id', enrolledCourseIds)
    : { data: [] }

  const notesMap: Record<string, string> = Object.fromEntries(
    (myNotes ?? []).map(n => [n.course_id, n.content])
  )

  // Sessioni + presenze
  const { data: sessions } = await supabase
    .from('course_sessions')
    .select('id, title, session_date, course_id')
    .in('course_id', enrolledCourseIds)
    .order('session_date', { ascending: true })

  const sessionIds = sessions?.map(s => s.id) ?? []

  const { data: attendances } = sessionIds.length > 0
    ? await supabase
        .from('attendances')
        .select('session_id, present')
        .eq('student_id', studentId)
        .in('session_id', sessionIds)
    : { data: [] }

  const attMap: Record<string, boolean> = Object.fromEntries(
    attendances?.map(a => [a.session_id, a.present]) ?? []
  )

  // Raggruppa sessioni per corso
  const courseMap: Record<string, { name: string; sessions: NonNullable<typeof sessions> }> = {}
  for (const r of myCoursesData ?? []) {
    if (enrolledCourseIds.includes(r.course_id)) {
      courseMap[r.course_id] = {
        name: (r.courses as unknown as { name: string } | null)?.name ?? r.course_id,
        sessions: [],
      }
    }
  }
  for (const s of sessions ?? []) {
    courseMap[s.course_id]?.sessions.push(s)
  }

  const courseGroups = Object.entries(courseMap).map(([cid, c]) => {
    const total = c.sessions.length
    const present = c.sessions.filter(s => attMap[s.id] === true).length
    const pct = total > 0 ? Math.round((present / total) * 100) : null
    return { courseId: cid, courseName: c.name, sessions: c.sessions, total, present, pct }
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href={isSuperAdmin ? '/super-admin/utenti' : '/docente/corsisti'}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
        >
          <ArrowLeft size={15} /> {isSuperAdmin ? 'Utenti' : 'Corsisti'}
        </Link>
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
            style={{ backgroundColor: '#1565C0' }}
          >
            {student.full_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-900">{student.full_name}</h2>
            <p className="text-gray-500 text-sm">{student.email}</p>
          </div>
          <InviaNotificaBtn studentId={student.id} studentName={student.full_name} />
        </div>
      </div>

      {courseGroups.map(group => (
        <div key={group.courseId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900">{group.courseName}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{group.total} sessioni</p>
            </div>
            {group.pct !== null && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${group.pct >= 75 ? 'bg-green-500' : group.pct >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                    style={{ width: `${group.pct}%` }}
                  />
                </div>
                <span className={`text-sm font-bold w-10 text-right ${group.pct >= 75 ? 'text-green-700' : group.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                  {group.pct}%
                </span>
              </div>
            )}
            <Link
              href={`/docente/corsi/${group.courseId}/presenze`}
              className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition px-2 py-1 rounded-lg hover:bg-blue-50"
            >
              <ClipboardList size={12} /> Registro
            </Link>
          </div>

          <div className="divide-y divide-gray-50">
            {group.sessions.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">Nessuna sessione registrata.</p>
            ) : (
              group.sessions.map(s => {
                const hasRecord = s.id in attMap
                const isPresent = attMap[s.id]
                return (
                  <div key={s.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-shrink-0 w-10 text-center">
                      <p className="text-sm font-bold text-gray-900 leading-tight">
                        {new Date(s.session_date).toLocaleDateString('it-IT', { day: '2-digit' })}
                      </p>
                      <p className="text-xs text-gray-400 uppercase">
                        {new Date(s.session_date).toLocaleDateString('it-IT', { month: 'short' })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {!hasRecord ? (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Minus size={12} /> Non rilevata
                        </span>
                      ) : isPresent ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                          <Check size={12} /> Presente
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-1 rounded-full">
                          <X size={12} /> Assente
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {group.total > 0 && (
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Presenze: {group.present}/{group.total}
              </span>
              {group.pct !== null && (
                <span className={`text-xs font-semibold ${group.pct >= 75 ? 'text-green-700' : group.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                  {group.pct >= 75 ? 'Idoneo' : 'Non idoneo'} ({group.pct}%)
                </span>
              )}
            </div>
          )}
          {/* Task del corso per questo corsista */}
          {(tasksByCourse[group.courseId] ?? []).length > 0 && (() => {
            const tasks = tasksByCourse[group.courseId]!
            const submitted = tasks.filter(t => submissionMap.has(t.id)).length
            const graded = tasks.filter(t => submissionMap.get(t.id)?.grade).length
            return (
              <div className="px-5 py-3 bg-blue-50 border-t border-blue-100">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-blue-700">
                    Task: {submitted}/{tasks.length} consegnati
                    {graded > 0 && ` · ${graded} valutati`}
                  </span>
                  <Link
                    href={`/docente/corsi/${group.courseId}/task`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Vedi task →
                  </Link>
                </div>
                <div className="mt-2 space-y-1">
                  {tasks.map(t => {
                    const sub = submissionMap.get(t.id)
                    return (
                      <div key={t.id} className="flex items-center gap-2 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sub ? (sub.grade ? 'bg-green-500' : 'bg-blue-400') : 'bg-gray-300'}`} />
                        <span className="text-gray-700 truncate flex-1">{t.title}</span>
                        {sub?.grade && <span className="text-green-700 font-semibold flex-shrink-0">{sub.grade}</span>}
                        {sub && !sub.grade && <span className="text-blue-500 flex-shrink-0">Consegnato</span>}
                        {!sub && <span className="text-gray-400 flex-shrink-0">Non consegnato</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
          {/* Quiz del corso per questo corsista */}
          {(quizzesByCourse[group.courseId] ?? []).length > 0 && (() => {
            const quizzes = quizzesByCourse[group.courseId]!
            const completed = quizzes.filter(q => attemptMap.has(q.id)).length
            const passed = quizzes.filter(q => attemptMap.get(q.id)?.passed).length
            return (
              <div className="px-5 py-3 bg-indigo-50 border-t border-indigo-100">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-indigo-700">
                    <ClipboardCheck size={11} className="inline mr-1" />
                    Quiz: {completed}/{quizzes.length} completati
                    {passed > 0 && ` · ${passed} superati`}
                  </span>
                  <Link
                    href={`/docente/corsi/${group.courseId}/quiz`}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Vedi quiz →
                  </Link>
                </div>
                <div className="mt-2 space-y-1">
                  {quizzes.map(q => {
                    const attempt = attemptMap.get(q.id)
                    const pct = attempt ? Math.round((attempt.score / attempt.total) * 100) : null
                    return (
                      <div key={q.id} className="flex items-center gap-2 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${attempt ? (attempt.passed ? 'bg-green-500' : 'bg-red-400') : 'bg-gray-300'}`} />
                        <span className="text-gray-700 truncate flex-1">{q.title}</span>
                        {attempt && pct !== null && (
                          <span className={`font-semibold flex-shrink-0 ${attempt.passed ? 'text-green-700' : 'text-red-600'}`}>
                            {pct}%
                          </span>
                        )}
                        {attempt && !attempt.passed && <span className="text-red-500 flex-shrink-0">Non superato</span>}
                        {attempt && attempt.passed && <span className="text-green-600 flex-shrink-0">Superato</span>}
                        {!attempt && <span className="text-gray-400 flex-shrink-0">Non completato</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
          <NotaPrivataEditor
            courseId={group.courseId}
            studentId={studentId}
            initialContent={notesMap[group.courseId] ?? null}
          />
        </div>
      ))}
    </div>
  )
}
