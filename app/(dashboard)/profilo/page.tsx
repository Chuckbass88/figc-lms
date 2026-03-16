import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfiloClient from './ProfiloClient'

type RoleStats =
  | { role: 'studente'; activeCoursesCount: number; avgAttendance: number | null; idoneiCount: number }
  | { role: 'docente'; assignedCoursesCount: number; totalStudents: number }
  | { role: 'super_admin'; totalUsers: number; totalCourses: number }

export default async function ProfiloPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .eq('id', user.id)
    .single()

  if (!profile) notFound()

  let stats: RoleStats | null = null

  if (profile.role === 'studente') {
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('course_id')
      .eq('student_id', user.id)
      .eq('status', 'active')

    const courseIds = enrollments?.map(e => e.course_id) ?? []

    if (courseIds.length > 0) {
      const [{ data: sessions }, { data: attendances }] = await Promise.all([
        supabase.from('course_sessions').select('id, course_id').in('course_id', courseIds),
        supabase.from('attendances').select('session_id, present').eq('student_id', user.id),
      ])

      const sessionsByCourse = new Map<string, string[]>()
      for (const s of sessions ?? []) {
        if (!sessionsByCourse.has(s.course_id)) sessionsByCourse.set(s.course_id, [])
        sessionsByCourse.get(s.course_id)!.push(s.id)
      }

      const presentSet = new Set(
        (attendances ?? []).filter(a => a.present).map(a => a.session_id)
      )

      let totalPct = 0
      let idonei = 0
      let coursesWithSessions = 0

      for (const courseId of courseIds) {
        const sIds = sessionsByCourse.get(courseId) ?? []
        if (sIds.length === 0) continue
        coursesWithSessions++
        const present = sIds.filter(sid => presentSet.has(sid)).length
        const pct = Math.round((present / sIds.length) * 100)
        totalPct += pct
        if (pct >= 75) idonei++
      }

      stats = {
        role: 'studente',
        activeCoursesCount: courseIds.length,
        avgAttendance: coursesWithSessions > 0 ? Math.round(totalPct / coursesWithSessions) : null,
        idoneiCount: idonei,
      }
    } else {
      stats = { role: 'studente', activeCoursesCount: 0, avgAttendance: null, idoneiCount: 0 }
    }
  } else if (profile.role === 'docente') {
    const { data: instructorCourses } = await supabase
      .from('course_instructors')
      .select('course_id')
      .eq('instructor_id', user.id)

    const courseIds = instructorCourses?.map(c => c.course_id) ?? []
    let totalStudents = 0

    if (courseIds.length > 0) {
      const { count } = await supabase
        .from('course_enrollments')
        .select('*', { count: 'exact', head: true })
        .in('course_id', courseIds)
        .eq('status', 'active')
      totalStudents = count ?? 0
    }

    stats = { role: 'docente', assignedCoursesCount: courseIds.length, totalStudents }
  } else if (profile.role === 'super_admin') {
    const [{ count: totalUsers }, { count: totalCourses }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('courses').select('*', { count: 'exact', head: true }),
    ])
    stats = { role: 'super_admin', totalUsers: totalUsers ?? 0, totalCourses: totalCourses ?? 0 }
  }

  return <ProfiloClient profile={profile} stats={stats} />
}
