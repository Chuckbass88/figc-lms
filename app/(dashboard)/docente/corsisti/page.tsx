import { createClient } from '@/lib/supabase/server'
import CorsistiClient from './CorsistiClient'

interface StudentWithAttendance {
  id: string
  full_name: string
  email: string
  pct: number | null
  att: { present: number; total: number } | null
  taskConsegnati: number
  taskTotali: number
  quizSuperati: number
  quizTotali: number
}

interface CourseGroup {
  courseId: string
  courseName: string
  totalSessions: number
  students: StudentWithAttendance[]
}

export default async function DocenteCorsisti() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myCoursesData } = await supabase
    .from('course_instructors')
    .select('course_id, courses(id, name, location)')
    .eq('instructor_id', user.id)

  const courseIds = myCoursesData?.map(r => r.course_id) ?? []

  const [enrollmentsResult, sessionsResult] = await Promise.all([
    courseIds.length > 0
      ? supabase
          .from('course_enrollments')
          .select('id, status, course_id, profiles(id, full_name, email), courses(name)')
          .in('course_id', courseIds)
          .eq('status', 'active')
          .order('course_id')
      : Promise.resolve({ data: [] }),
    courseIds.length > 0
      ? supabase
          .from('course_sessions')
          .select('id, course_id')
          .in('course_id', courseIds)
      : Promise.resolve({ data: [] }),
  ])

  const enrollments = (enrollmentsResult as { data: {
    id: string; status: string; course_id: string;
    profiles: { id: string; full_name: string; email: string } | null;
    courses: { name: string } | null
  }[] | null }).data ?? []

  const sessions = (sessionsResult as { data: { id: string; course_id: string }[] | null }).data ?? []
  const sessionIds = sessions.map(s => s.id)

  // Fetch tutte le presenze per queste sessioni
  const { data: allAttendances } = sessionIds.length > 0
    ? await supabase
        .from('attendances')
        .select('session_id, student_id, present')
        .in('session_id', sessionIds)
    : { data: [] }

  // Mappa sessioni per corso
  const sessionsByCourse: Record<string, string[]> = {}
  for (const s of sessions) {
    if (!sessionsByCourse[s.course_id]) sessionsByCourse[s.course_id] = []
    sessionsByCourse[s.course_id].push(s.id)
  }

  // Presenza per studente per corso
  function getAttendance(studentId: string, courseId: string): { present: number; total: number } | null {
    const courseSessions = sessionsByCourse[courseId] ?? []
    if (courseSessions.length === 0) return null
    const present = (allAttendances ?? []).filter(
      a => a.student_id === studentId && courseSessions.includes(a.session_id) && a.present
    ).length
    return { present, total: courseSessions.length }
  }

  // Fetch quiz e task per i corsi del docente
  const [{ data: courseQuizzes }, { data: courseTasks }] = courseIds.length > 0
    ? await Promise.all([
        supabase.from('course_quizzes').select('id, course_id').in('course_id', courseIds),
        supabase.from('course_tasks').select('id, course_id').in('course_id', courseIds),
      ])
    : [{ data: [] }, { data: [] }]

  const quizIds = (courseQuizzes ?? []).map((q: { id: string; course_id: string }) => q.id)
  const taskIds = (courseTasks ?? []).map((t: { id: string; course_id: string }) => t.id)

  const studentIds = enrollments
    .map(e => e.profiles?.id)
    .filter(Boolean) as string[]

  const [{ data: allAttempts }, { data: allSubmissions }] = await Promise.all([
    quizIds.length > 0 && studentIds.length > 0
      ? supabase.from('quiz_attempts').select('quiz_id, student_id, passed').in('quiz_id', quizIds).in('student_id', studentIds)
      : Promise.resolve({ data: [] }),
    taskIds.length > 0 && studentIds.length > 0
      ? supabase.from('task_submissions').select('task_id, student_id').in('task_id', taskIds).in('student_id', studentIds)
      : Promise.resolve({ data: [] }),
  ])

  // Mappa quiz/task per corso
  const quizzesByCourse: Record<string, string[]> = {}
  for (const q of courseQuizzes ?? []) {
    if (!quizzesByCourse[(q as { id: string; course_id: string }).course_id]) quizzesByCourse[(q as { id: string; course_id: string }).course_id] = []
    quizzesByCourse[(q as { id: string; course_id: string }).course_id].push((q as { id: string; course_id: string }).id)
  }
  const tasksByCourse: Record<string, string[]> = {}
  for (const t of courseTasks ?? []) {
    if (!tasksByCourse[(t as { id: string; course_id: string }).course_id]) tasksByCourse[(t as { id: string; course_id: string }).course_id] = []
    tasksByCourse[(t as { id: string; course_id: string }).course_id].push((t as { id: string; course_id: string }).id)
  }

  // Raggruppa per corso e calcola la presenza per ogni studente
  const byCourseMap: Record<string, CourseGroup> = {}

  for (const e of enrollments) {
    const cid = e.course_id
    const courseName = e.courses?.name ?? cid
    const profile = e.profiles
    if (!byCourseMap[cid]) {
      byCourseMap[cid] = {
        courseId: cid,
        courseName,
        totalSessions: (sessionsByCourse[cid] ?? []).length,
        students: [],
      }
    }
    if (profile) {
      const att = getAttendance(profile.id, cid)
      const pct = att ? Math.round((att.present / att.total) * 100) : null

      const courseQuizIds = quizzesByCourse[cid] ?? []
      const courseTaskIds = tasksByCourse[cid] ?? []

      const quizSuperati = (allAttempts ?? []).filter(
        (a: { quiz_id: string; student_id: string; passed: boolean }) =>
          a.student_id === profile.id && courseQuizIds.includes(a.quiz_id) && a.passed
      ).length

      const taskConsegnati = (allSubmissions ?? []).filter(
        (s: { task_id: string; student_id: string }) =>
          s.student_id === profile.id && courseTaskIds.includes(s.task_id)
      ).length

      byCourseMap[cid].students.push({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        pct,
        att,
        quizSuperati,
        quizTotali: courseQuizIds.length,
        taskConsegnati,
        taskTotali: courseTaskIds.length,
      })
    }
  }

  const courseGroups: CourseGroup[] = Object.values(byCourseMap)
  const totalStudents = enrollments.length

  return (
    <CorsistiClient courseGroups={courseGroups} totalStudents={totalStudents} />
  )
}
