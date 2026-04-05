import { createClient } from '@/lib/supabase/server'
import { BarChart2, GraduationCap, BookOpen, ClipboardList } from 'lucide-react'
import ReportDocenteClient from './ReportDocenteClient'

export default async function DocenteReport() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Corsi del docente
  const { data: myCoursesData } = await supabase
    .from('course_instructors')
    .select('course_id, courses(id, name)')
    .eq('instructor_id', user.id)

  const courseIds: string[] = []
  const courseNameMap: Record<string, string> = {}
  for (const r of myCoursesData ?? []) {
    const c = r.courses as unknown as { id: string; name: string } | null
    if (c) { courseIds.push(c.id); courseNameMap[c.id] = c.name }
  }

  if (courseIds.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Report Idoneità</h2>
          <p className="text-gray-500 text-sm mt-1">Panoramica corsisti sui tuoi corsi</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BarChart2 size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nessun corso assegnato</p>
          <p className="text-gray-400 text-sm mt-1">Non hai ancora corsi a cui sei assegnato come docente.</p>
        </div>
      </div>
    )
  }

  const [
    { data: sessions },
    { data: attendances },
    { data: enrollments },
    { data: quizzes },
    { data: tasks },
  ] = await Promise.all([
    supabase.from('course_sessions').select('id, course_id').in('course_id', courseIds),
    supabase.from('attendances').select('session_id, student_id, present'),
    supabase.from('course_enrollments')
      .select('course_id, student_id, profiles(id, full_name, email)')
      .in('course_id', courseIds)
      .eq('status', 'active'),
    supabase.from('course_quizzes').select('id, course_id').in('course_id', courseIds),
    supabase.from('course_tasks').select('id, course_id').in('course_id', courseIds),
  ])

  // Indici
  const sessionsByCourse: Record<string, string[]> = {}
  for (const s of sessions ?? []) {
    if (!sessionsByCourse[s.course_id]) sessionsByCourse[s.course_id] = []
    sessionsByCourse[s.course_id].push(s.id)
  }

  const attMap = new Map<string, boolean>()
  for (const a of attendances ?? []) {
    attMap.set(`${a.session_id}:${a.student_id}`, a.present)
  }

  const quizzesByCourse: Record<string, string[]> = {}
  for (const q of quizzes ?? []) {
    if (!quizzesByCourse[q.course_id]) quizzesByCourse[q.course_id] = []
    quizzesByCourse[q.course_id].push(q.id)
  }

  const tasksByCourse: Record<string, string[]> = {}
  for (const t of tasks ?? []) {
    if (!tasksByCourse[t.course_id]) tasksByCourse[t.course_id] = []
    tasksByCourse[t.course_id].push(t.id)
  }

  // Unique students across all my courses
  const studentMap = new Map<string, { id: string; full_name: string; email: string }>()
  const coursesByStudent: Record<string, string[]> = {}
  for (const e of enrollments ?? []) {
    const p = e.profiles as unknown as { id: string; full_name: string; email: string } | null
    if (!p) continue
    studentMap.set(p.id, p)
    if (!coursesByStudent[p.id]) coursesByStudent[p.id] = []
    coursesByStudent[p.id].push(e.course_id)
  }

  const allStudentIds = [...studentMap.keys()]
  const quizIds = (quizzes ?? []).map(q => q.id)
  const taskIds = (tasks ?? []).map(t => t.id)

  const [{ data: allAttempts }, { data: allSubmissions }] = await Promise.all([
    quizIds.length > 0 && allStudentIds.length > 0
      ? supabase.from('quiz_attempts').select('quiz_id, student_id, passed').in('quiz_id', quizIds).in('student_id', allStudentIds)
      : Promise.resolve({ data: [] }),
    taskIds.length > 0 && allStudentIds.length > 0
      ? supabase.from('task_submissions').select('task_id, student_id').in('task_id', taskIds).in('student_id', allStudentIds)
      : Promise.resolve({ data: [] }),
  ])

  // Compute per-student report
  type StudentRow = {
    id: string; full_name: string; email: string
    presenzePct: number | null; idoneoPresenze: boolean | null
    quizCompletati: number; quizSuperati: number; totalQuiz: number
    taskConsegnati: number; totalTask: number
    corsiIdonei: number; corsiTotali: number
    courseDetails: { id: string; name: string; sessions: number; present: number; pct: number | null }[]
  }

  const studentReports: StudentRow[] = [...studentMap.values()]
    .sort((a, b) => a.full_name.localeCompare(b.full_name))
    .map(p => {
      const enrolledCourseIds = coursesByStudent[p.id] ?? []
      let totalSessions = 0, presentTotal = 0, totalQuiz = 0, quizCompletati = 0, quizSuperati = 0
      let totalTask = 0, taskConsegnati = 0, corsiIdonei = 0
      const courseDetails: StudentRow['courseDetails'] = []

      for (const courseId of enrolledCourseIds) {
        const courseSessions = sessionsByCourse[courseId] ?? []
        const presCount = courseSessions.filter(sid => attMap.get(`${sid}:${p.id}`) === true).length
        totalSessions += courseSessions.length
        presentTotal += presCount
        const pct = courseSessions.length > 0 ? Math.round((presCount / courseSessions.length) * 100) : null
        if (pct !== null && pct >= 75) corsiIdonei++
        courseDetails.push({ id: courseId, name: courseNameMap[courseId] ?? courseId, sessions: courseSessions.length, present: presCount, pct })

        const courseQuizIds = quizzesByCourse[courseId] ?? []
        totalQuiz += courseQuizIds.length
        const studentAttempts = (allAttempts ?? []).filter(a => a.student_id === p.id && courseQuizIds.includes(a.quiz_id))
        quizCompletati += studentAttempts.length
        quizSuperati += studentAttempts.filter(a => a.passed).length

        const courseTaskIds = tasksByCourse[courseId] ?? []
        totalTask += courseTaskIds.length
        taskConsegnati += (allSubmissions ?? []).filter(s => s.student_id === p.id && courseTaskIds.includes(s.task_id)).length
      }

      const presenzePct = totalSessions > 0 ? Math.round((presentTotal / totalSessions) * 100) : null
      const idoneoPresenze = presenzePct !== null ? presenzePct >= 75 : null

      return {
        id: p.id, full_name: p.full_name, email: p.email,
        presenzePct, idoneoPresenze,
        quizCompletati, quizSuperati, totalQuiz,
        taskConsegnati, totalTask,
        corsiIdonei, corsiTotali: enrolledCourseIds.length,
        courseDetails,
      }
    })

  const idoneiCount = studentReports.filter(s => s.idoneoPresenze === true).length
  const totalStudents = studentReports.length
  const totalSessions = (sessions ?? []).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Report Idoneità</h2>
        <p className="text-gray-500 text-sm mt-1">Panoramica corsisti su {courseIds.length} {courseIds.length === 1 ? 'corso' : 'corsi'}</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Corsi', value: courseIds.length, icon: <BookOpen size={18} />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Corsisti attivi', value: totalStudents, icon: <GraduationCap size={18} />, color: 'text-green-600 bg-green-50' },
          { label: 'Sessioni totali', value: totalSessions, icon: <ClipboardList size={18} />, color: 'text-indigo-600 bg-indigo-50' },
          {
            label: 'Idonei (≥75%)',
            value: totalStudents > 0 ? `${idoneiCount}/${totalStudents}` : '—',
            icon: <BarChart2 size={18} />,
            color: idoneiCount === totalStudents && totalStudents > 0 ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50',
          },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${kpi.color} flex-shrink-0`}>{kpi.icon}</div>
            <div>
              <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-xs text-gray-500">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      <ReportDocenteClient studentReports={studentReports} />
    </div>
  )
}
