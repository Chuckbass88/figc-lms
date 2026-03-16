import { createClient } from '@/lib/supabase/server'
import CorsiStudenteClient from './CorsiStudenteClient'

export default async function StudenteCorsi() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select(`
      id, status, enrolled_at,
      courses(
        id, name, description, location, start_date, end_date, status, category,
        course_instructors(profiles(full_name))
      )
    `)
    .eq('student_id', user.id)
    .order('enrolled_at', { ascending: false })

  const courseIds = (enrollments ?? [])
    .map(e => (e.courses as unknown as { id: string } | null)?.id)
    .filter(Boolean) as string[]

  const { data: sessions } = courseIds.length > 0
    ? await supabase.from('course_sessions').select('id, course_id').in('course_id', courseIds)
    : { data: [] }

  const sessionIds = (sessions ?? []).map(s => s.id)

  const { data: attendances } = sessionIds.length > 0
    ? await supabase
        .from('attendances')
        .select('session_id, present')
        .in('session_id', sessionIds)
        .eq('student_id', user.id)
    : { data: [] }

  const attMap = new Map<string, boolean>()
  for (const a of attendances ?? []) attMap.set(a.session_id, a.present)

  const courseAttendance = new Map<string, { total: number; present: number }>()
  for (const s of sessions ?? []) {
    const existing = courseAttendance.get(s.course_id) ?? { total: 0, present: 0 }
    existing.total++
    if (attMap.get(s.id)) existing.present++
    courseAttendance.set(s.course_id, existing)
  }

  // Quiz e task stats per corso
  const [{ data: courseQuizzes }, { data: courseTasks }] = await Promise.all([
    courseIds.length > 0
      ? supabase.from('course_quizzes').select('id, course_id').in('course_id', courseIds)
      : Promise.resolve({ data: [] }),
    courseIds.length > 0
      ? supabase.from('course_tasks').select('id, course_id').in('course_id', courseIds)
      : Promise.resolve({ data: [] }),
  ])

  const allQuizIds = (courseQuizzes ?? []).map((q: { id: string; course_id: string }) => q.id)
  const allTaskIds = (courseTasks ?? []).map((t: { id: string; course_id: string }) => t.id)

  const [{ data: myAttempts }, { data: mySubmissions }] = await Promise.all([
    allQuizIds.length > 0
      ? supabase.from('quiz_attempts').select('quiz_id, passed').eq('student_id', user.id).in('quiz_id', allQuizIds)
      : Promise.resolve({ data: [] }),
    allTaskIds.length > 0
      ? supabase.from('task_submissions').select('task_id').eq('student_id', user.id).in('task_id', allTaskIds)
      : Promise.resolve({ data: [] }),
  ])

  type AttemptRow = { quiz_id: string; passed: boolean }
  type SubRow = { task_id: string }

  const quizzesByCourse = new Map<string, string[]>()
  for (const q of (courseQuizzes ?? []) as { id: string; course_id: string }[]) {
    if (!quizzesByCourse.has(q.course_id)) quizzesByCourse.set(q.course_id, [])
    quizzesByCourse.get(q.course_id)!.push(q.id)
  }
  const tasksByCourse = new Map<string, string[]>()
  for (const t of (courseTasks ?? []) as { id: string; course_id: string }[]) {
    if (!tasksByCourse.has(t.course_id)) tasksByCourse.set(t.course_id, [])
    tasksByCourse.get(t.course_id)!.push(t.id)
  }

  const attemptMap = new Map((myAttempts as AttemptRow[] ?? []).map(a => [a.quiz_id, a.passed]))
  const submittedSet = new Set((mySubmissions as SubRow[] ?? []).map(s => s.task_id))

  const data = (enrollments ?? []).flatMap(enrollment => {
    const course = enrollment.courses as unknown as {
      id: string; name: string; description: string | null
      location: string | null; start_date: string | null; end_date: string | null
      status: string; category: string | null
      course_instructors: { profiles: { full_name: string } | null }[]
    } | null
    if (!course) return []
    const att = courseAttendance.get(course.id) ?? null
    const courseQuizIds = quizzesByCourse.get(course.id) ?? []
    const courseTaskIds = tasksByCourse.get(course.id) ?? []
    const quizCompleted = courseQuizIds.filter(id => attemptMap.has(id)).length
    const quizPassed = courseQuizIds.filter(id => attemptMap.get(id) === true).length
    const taskSubmitted = courseTaskIds.filter(id => submittedSet.has(id)).length
    return [{
      id: enrollment.id,
      status: enrollment.status,
      course: {
        id: course.id,
        name: course.name,
        description: course.description,
        location: course.location,
        start_date: course.start_date,
        end_date: course.end_date,
        status: course.status,
        category: course.category,
        instructors: course.course_instructors
          .map(ci => ci.profiles?.full_name)
          .filter(Boolean) as string[],
      },
      att: att && att.total > 0 ? att : null,
      quizStats: courseQuizIds.length > 0 ? { total: courseQuizIds.length, completed: quizCompleted, passed: quizPassed } : null,
      taskStats: courseTaskIds.length > 0 ? { total: courseTaskIds.length, submitted: taskSubmitted } : null,
    }]
  })

  return <CorsiStudenteClient enrollments={data} />
}
