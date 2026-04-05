export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, ClipboardList, Clock, Users, CheckCircle, ChevronRight } from 'lucide-react'
import NuovoTaskForm from './NuovoTaskForm'

export default async function DocenteTaskPage({ params }: { params: Promise<{ id: string }> }) {
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
    { data: tasks },
    { data: groups },
    { data: enrollments },
  ] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', id).single(),
    supabase.from('course_tasks')
      .select('*, task_submissions(id, grade)')
      .eq('course_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('course_groups').select('id, name').eq('course_id', id),
    supabase.from('course_enrollments').select('student_id, profiles(id, full_name)').eq('course_id', id).eq('status', 'active'),
  ])

  if (!course) notFound()

  type EnrollWithProfile = { student_id: string; profiles: { id: string; full_name: string } | null }
  const studentCount = enrollments?.length ?? 0
  const students = (enrollments as unknown as EnrollWithProfile[] ?? [])
    .map(e => e.profiles)
    .filter(Boolean) as { id: string; full_name: string }[]
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href={`/docente/corsi/${id}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
        >
          <ArrowLeft size={15} /> {course.name}
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Task del corso</h2>
            <p className="text-gray-500 text-sm mt-1">{tasks?.length ?? 0} task · {studentCount} corsisti</p>
          </div>
          <NuovoTaskForm courseId={id} groups={groups ?? []} students={students} />
        </div>
      </div>

      <div className="space-y-3">
        {tasks?.map(task => {
          type Sub = { id: string; grade: string | null }
          const submissions = task.task_submissions as Sub[] ?? []
          const subCount = submissions.length
          const valutatoCount = submissions.filter(s => s.grade).length
          const isOverdue = task.due_date && task.due_date < today
          const group = groups?.find(g => g.id === task.group_id)

          return (
            <div key={task.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{task.title}</p>
                  {task.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${group ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                      {group ? group.name : 'Tutto il corso'}
                    </span>
                    {task.due_date && (
                      <span className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                        <Clock size={11} />
                        {new Date(task.due_date).toLocaleDateString('it-IT')}
                        {isOverdue && ' — Scaduto'}
                      </span>
                    )}
                    {valutatoCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle size={11} /> {valutatoCount} valutati
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Users size={12} />
                  {subCount} di {studentCount} consegnati
                </span>
                <Link
                  href={`/docente/corsi/${id}/task/${task.id}`}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: '#1565C0' }}
                >
                  Apri task
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          )
        })}

        {(!tasks || tasks.length === 0) && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <ClipboardList size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nessun task assegnato</p>
            <p className="text-gray-400 text-sm mt-1">Usa il modulo sopra per creare il primo task.</p>
          </div>
        )}
      </div>
    </div>
  )
}
