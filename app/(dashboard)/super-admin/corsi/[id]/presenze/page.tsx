import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import PresenzeAdminClient from './PresenzeAdminClient'

export default async function AdminPresenze({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: course },
    { data: sessions },
    { data: enrollments },
  ] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', id).single(),
    supabase.from('course_sessions')
      .select('id, title, session_date, attendances(student_id, present)')
      .eq('course_id', id)
      .order('session_date', { ascending: true }),
    supabase.from('course_enrollments')
      .select('profiles(id, full_name)')
      .eq('course_id', id)
      .eq('status', 'active'),
  ])

  if (!course) notFound()

  const students = enrollments
    ?.map(e => e.profiles as unknown as { id: string; full_name: string } | null)
    .filter(Boolean) as { id: string; full_name: string }[] ?? []

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href={`/super-admin/corsi/${id}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
        >
          <ArrowLeft size={15} /> {course.name}
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Registro Presenze</h2>
        <p className="text-gray-500 text-sm mt-1">
          {(sessions ?? []).length} sessioni · {students.length} corsisti
        </p>
      </div>

      <PresenzeAdminClient
        courseId={id}
        courseName={course.name}
        initialSessions={sessions ?? []}
        students={students}
      />
    </div>
  )
}
