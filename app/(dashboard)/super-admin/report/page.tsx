import { createClient } from '@/lib/supabase/server'
import { BarChart2, TrendingUp, ClipboardList, GraduationCap } from 'lucide-react'
import ReportClient from './ReportClient'

export default async function ReportPresenze() {
  const supabase = await createClient()

  const [
    { data: courses },
    { data: sessions },
    { data: attendances },
    { data: enrollments },
    { data: profiles },
    { data: quizzes },
    { data: tasks },
  ] = await Promise.all([
    supabase.from('courses').select('id, name, status, category').order('created_at', { ascending: false }),
    supabase.from('course_sessions').select('id, course_id'),
    supabase.from('attendances').select('session_id, student_id, present'),
    supabase.from('course_enrollments').select('course_id, student_id').eq('status', 'active'),
    supabase.from('profiles').select('id, full_name, email').eq('role', 'studente').order('full_name'),
    supabase.from('course_quizzes').select('id, course_id'),
    supabase.from('course_tasks').select('id, course_id'),
  ])

  const courseList = courses ?? []
  const sessionList = sessions ?? []
  const attendanceList = attendances ?? []
  const enrollmentList = enrollments ?? []
  const profileList = profiles ?? []

  // Indici per calcoli rapidi
  const sessionsByCourse: Record<string, string[]> = {}
  for (const s of sessionList) {
    if (!sessionsByCourse[s.course_id]) sessionsByCourse[s.course_id] = []
    sessionsByCourse[s.course_id].push(s.id)
  }

  const studentsByCourse: Record<string, string[]> = {}
  for (const e of enrollmentList) {
    if (!studentsByCourse[e.course_id]) studentsByCourse[e.course_id] = []
    studentsByCourse[e.course_id].push(e.student_id)
  }

  const coursesByStudent: Record<string, string[]> = {}
  for (const e of enrollmentList) {
    if (!coursesByStudent[e.student_id]) coursesByStudent[e.student_id] = []
    coursesByStudent[e.student_id].push(e.course_id)
  }

  // Mappa presenze: session_id+student_id → present
  const attMap = new Map<string, boolean>()
  for (const a of attendanceList) {
    attMap.set(`${a.session_id}:${a.student_id}`, a.present)
  }

  // Report per corso
  const reports = courseList.map(course => {
    const courseSessions = sessionsByCourse[course.id] ?? []
    const courseStudents = studentsByCourse[course.id] ?? []
    const totalSessions = courseSessions.length
    const totalStudents = courseStudents.length

    if (totalSessions === 0 || totalStudents === 0) {
      return {
        id: course.id, name: course.name, status: course.status,
        category: course.category ?? null, totalSessions, totalStudents,
        avgAttendance: null, presentTotal: 0, possibleTotal: 0,
      }
    }

    const relevantAttendances = attendanceList.filter(a => courseSessions.includes(a.session_id))
    const presentTotal = relevantAttendances.filter(a => a.present).length
    const possibleTotal = totalSessions * totalStudents
    const avgAttendance = possibleTotal > 0 ? Math.round((presentTotal / possibleTotal) * 100) : null

    return {
      id: course.id, name: course.name, status: course.status,
      category: course.category ?? null, totalSessions, totalStudents,
      avgAttendance, presentTotal, possibleTotal,
    }
  })

  // Report per corsista
  const courseNameMap: Record<string, string> = {}
  for (const c of courseList) courseNameMap[c.id] = c.name

  const studentReports = profileList
    .filter(p => coursesByStudent[p.id]?.length > 0)
    .map(p => {
      const enrolledCourseIds = coursesByStudent[p.id] ?? []
      let totalSessions = 0
      let presentTotal = 0
      const courseDetails: { id: string; name: string; sessions: number; present: number; pct: number | null }[] = []

      for (const courseId of enrolledCourseIds) {
        const courseSessions = sessionsByCourse[courseId] ?? []
        const sessCount = courseSessions.length
        const presCount = courseSessions.filter(sid => attMap.get(`${sid}:${p.id}`) === true).length
        totalSessions += sessCount
        presentTotal += presCount
        courseDetails.push({
          id: courseId,
          name: courseNameMap[courseId] ?? courseId,
          sessions: sessCount,
          present: presCount,
          pct: sessCount > 0 ? Math.round((presCount / sessCount) * 100) : null,
        })
      }

      const avgAttendance = totalSessions > 0 ? Math.round((presentTotal / totalSessions) * 100) : null

      return {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        coursesCount: enrolledCourseIds.length,
        totalSessions,
        presentTotal,
        avgAttendance,
        courses: courseDetails,
      }
    })

  const coursesWithData = reports.filter(r => r.avgAttendance !== null)
  const overallAvg = coursesWithData.length > 0
    ? Math.round(coursesWithData.reduce((sum, r) => sum + (r.avgAttendance ?? 0), 0) / coursesWithData.length)
    : null

  const activeStudentsCount = new Set(enrollmentList.map(e => e.student_id)).size

  // Quiz e task per idoneità aggregata
  const quizList = quizzes ?? []
  const taskList = tasks ?? []

  const quizIds = quizList.map(q => q.id)
  const taskIds = taskList.map(t => t.id)
  const allStudentIds = profileList.map(p => p.id)

  const [{ data: allAttempts }, { data: allSubmissions }] = await Promise.all([
    quizIds.length > 0 && allStudentIds.length > 0
      ? supabase.from('quiz_attempts').select('quiz_id, student_id, passed').in('quiz_id', quizIds).in('student_id', allStudentIds)
      : Promise.resolve({ data: [] }),
    taskIds.length > 0 && allStudentIds.length > 0
      ? supabase.from('task_submissions').select('task_id, student_id').in('task_id', taskIds).in('student_id', allStudentIds)
      : Promise.resolve({ data: [] }),
  ])

  // Quizzes e task per corso
  const quizzesByCourse: Record<string, string[]> = {}
  for (const q of quizList) {
    if (!quizzesByCourse[q.course_id]) quizzesByCourse[q.course_id] = []
    quizzesByCourse[q.course_id].push(q.id)
  }
  const tasksByCourse: Record<string, string[]> = {}
  for (const t of taskList) {
    if (!tasksByCourse[t.course_id]) tasksByCourse[t.course_id] = []
    tasksByCourse[t.course_id].push(t.id)
  }

  // Idoneità per corsista (aggregata su tutti i corsi iscritti)
  type IdoneitaRow = {
    id: string; full_name: string; email: string
    presenzePct: number | null; idoneoPresenze: boolean | null
    quizCompletati: number; quizSuperati: number; totalQuiz: number
    taskConsegnati: number; totalTask: number
    corsiIdonei: number; corsiTotali: number
  }

  const idoneitaReports: IdoneitaRow[] = profileList
    .filter(p => coursesByStudent[p.id]?.length > 0)
    .map(p => {
      const enrolledCourseIds = coursesByStudent[p.id] ?? []
      let totalSessions = 0, presentTotal = 0, totalQuiz = 0, quizCompletati = 0, quizSuperati = 0
      let totalTask = 0, taskConsegnati = 0, corsiIdonei = 0

      for (const courseId of enrolledCourseIds) {
        const courseSessions = sessionsByCourse[courseId] ?? []
        const presCount = courseSessions.filter(sid => attMap.get(`${sid}:${p.id}`) === true).length
        totalSessions += courseSessions.length
        presentTotal += presCount
        const coursePct = courseSessions.length > 0 ? Math.round((presCount / courseSessions.length) * 100) : null
        if (coursePct !== null && coursePct >= 75) corsiIdonei++

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
      }
    })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Report Presenze</h2>
        <p className="text-gray-500 text-sm mt-1">Panoramica presenze su tutti i corsi</p>
      </div>

      {/* KPI globali */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Corsi totali', value: courseList.length, icon: <ClipboardList size={18} />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Sessioni totali', value: sessionList.length, icon: <BarChart2 size={18} />, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Corsisti attivi', value: activeStudentsCount, icon: <GraduationCap size={18} />, color: 'text-green-600 bg-green-50' },
          {
            label: 'Media presenze',
            value: overallAvg !== null ? `${overallAvg}%` : '—',
            icon: <TrendingUp size={18} />,
            color: overallAvg !== null && overallAvg >= 75 ? 'text-green-600 bg-green-50'
              : overallAvg !== null && overallAvg >= 50 ? 'text-amber-600 bg-amber-50'
              : 'text-red-500 bg-red-50',
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

      <ReportClient reports={reports} studentReports={studentReports} idoneitaReports={idoneitaReports} />
    </div>
  )
}
