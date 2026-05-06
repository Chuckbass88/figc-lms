import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProgrammaPageClient from './ProgrammaPageClient'

export default async function ProgrammaCorso({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [{ data: course }, { data: programs }, { data: instructors }, { data: profile }, { data: sessions }] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', courseId).single(),
    supabase.from('course_programs').select('*, creator:profiles!created_by(id, full_name)').eq('course_id', courseId).order('created_at'),
    supabase.from('course_instructors').select('profiles(id, full_name)').eq('course_id', courseId),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('course_sessions').select('id, title, session_date').eq('course_id', courseId).order('session_date'),
  ])

  if (!course) notFound()

  // Per ogni programma carica la struttura completa
  const programsWithDetails = await Promise.all(
    (programs ?? []).map(async (p) => {
      const { data } = await supabase
        .from('course_programs')
        .select(`*, creator:profiles!created_by(id, full_name), modules:program_modules(*, days:program_days(*, blocks:program_blocks(*, instructor:profiles!instructor_id(id, full_name))))`)
        .eq('id', p.id)
        .single()
      if (data) {
        data.modules?.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)
        data.modules?.forEach((m: { days?: { order_index: number; blocks?: { order_index: number }[] }[] }) => {
          m.days?.sort((a, b) => a.order_index - b.order_index)
          m.days?.forEach(d => d.blocks?.sort((a, b) => a.order_index - b.order_index))
        })
      }
      return data ?? p
    })
  )

  const courseInstructors = (instructors ?? [])
    .flatMap((i: { profiles: unknown }) => Array.isArray(i.profiles) ? i.profiles : [i.profiles])
    .filter(Boolean) as { id: string; full_name: string }[]

  return (
    <ProgrammaPageClient
      courseId={courseId}
      courseName={course.name}
      programs={programsWithDetails as never}
      courseInstructors={courseInstructors}
      courseSessions={(sessions ?? []) as { id: string; title: string; session_date: string }[]}
      role={profile?.role === 'super_admin' ? 'super_admin' : 'docente'}
      currentUserId={user.id}
    />
  )
}
