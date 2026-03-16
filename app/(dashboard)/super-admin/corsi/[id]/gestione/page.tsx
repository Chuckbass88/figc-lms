import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GestioneCorsoClient from './GestioneCorsoClient'

export default async function GestioneCorso({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: course },
    { data: allDocenti },
    { data: allStudenti },
    { data: assignedInstructors },
    { data: enrolledStudents },
  ] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', id).single(),
    supabase.from('profiles').select('id, full_name, email').eq('role', 'docente').order('full_name'),
    supabase.from('profiles').select('id, full_name, email').eq('role', 'studente').order('full_name'),
    supabase.from('course_instructors').select('instructor_id').eq('course_id', id),
    supabase.from('course_enrollments').select('student_id, status').eq('course_id', id),
  ])

  if (!course) notFound()

  const assignedIds = new Set(assignedInstructors?.map(r => r.instructor_id) ?? [])
  const enrolledIds = new Set(enrolledStudents?.map(r => r.student_id) ?? [])

  return (
    <GestioneCorsoClient
      course={course}
      allDocenti={allDocenti ?? []}
      allStudenti={allStudenti ?? []}
      assignedInstructorIds={[...assignedIds]}
      enrolledStudentIds={[...enrolledIds]}
    />
  )
}
