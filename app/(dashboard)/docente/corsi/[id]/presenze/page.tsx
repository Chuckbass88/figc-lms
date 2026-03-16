import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PresenzeClient from './PresenzeClient'

export default async function DocentePresenze({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isSuperAdmin = profile?.role === 'super_admin'

  if (!isSuperAdmin) {
    const { data: isInstructor } = await supabase
      .from('course_instructors')
      .select('instructor_id')
      .eq('course_id', id)
      .eq('instructor_id', user.id)
      .single()
    if (!isInstructor) notFound()
  }

  const [
    { data: course },
    { data: enrollments },
    { data: sessions },
  ] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', id).single(),
    supabase.from('course_enrollments')
      .select('profiles(id, full_name)')
      .eq('course_id', id)
      .eq('status', 'active'),
    supabase.from('course_sessions')
      .select('id, title, session_date, attendances(student_id, present)')
      .eq('course_id', id)
      .order('session_date', { ascending: false }),
  ])

  if (!course) notFound()

  const students = enrollments
    ?.map(e => e.profiles as unknown as { id: string; full_name: string } | null)
    .filter(Boolean) as { id: string; full_name: string }[] ?? []

  return (
    <PresenzeClient
      courseId={id}
      courseName={course.name}
      students={students}
      initialSessions={sessions ?? []}
    />
  )
}
