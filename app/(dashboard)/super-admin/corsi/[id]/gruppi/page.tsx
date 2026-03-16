import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GruppiClient from './GruppiClient'

export default async function GestioneGruppi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: course },
    { data: groups },
    { data: courseInstructors },
    { data: courseStudents },
  ] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', id).single(),
    supabase.from('course_groups').select(`
      id, name, description, created_at,
      course_group_members(student_id, profiles(id, full_name, email)),
      course_group_instructors(instructor_id, profiles(id, full_name, email))
    `).eq('course_id', id).order('created_at'),
    // Docenti assegnati al corso
    supabase.from('course_instructors').select('profiles(id, full_name, email)').eq('course_id', id),
    // Corsisti iscritti al corso
    supabase.from('course_enrollments').select('profiles(id, full_name, email)').eq('course_id', id).eq('status', 'active'),
  ])

  if (!course) notFound()

  const docenti = courseInstructors?.map(r => r.profiles).filter(Boolean) as unknown as { id: string; full_name: string; email: string }[] ?? []
  const studenti = courseStudents?.map(r => r.profiles).filter(Boolean) as unknown as { id: string; full_name: string; email: string }[] ?? []

  return (
    <GruppiClient
      course={course}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialGroups={(groups ?? []) as any}
      courseDocenti={docenti}
      courseStudenti={studenti}
    />
  )
}
