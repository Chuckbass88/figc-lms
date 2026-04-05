import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import GruppiClient from '@/app/(dashboard)/super-admin/corsi/[id]/gruppi/GruppiClient'

export default async function DocenteGestioneGruppi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Verifica che il docente sia assegnato al corso
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

  const admin = createAdminClient()

  const [
    { data: course },
    { data: groups },
    { data: courseInstructors },
    { data: courseStudents },
  ] = await Promise.all([
    admin.from('courses').select('id, name').eq('id', id).single(),
    admin.from('course_groups').select(`
      id, name, description, created_at,
      course_group_members(student_id, profiles(id, full_name, email)),
      course_group_instructors(instructor_id, profiles(id, full_name, email))
    `).eq('course_id', id).order('created_at'),
    admin.from('course_instructors').select('profiles(id, full_name, email)').eq('course_id', id),
    admin.from('course_enrollments').select('profiles(id, full_name, email)').eq('course_id', id).eq('status', 'active'),
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
      backPath={`/docente/corsi/${id}`}
    />
  )
}
