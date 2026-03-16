import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, ClipboardList, Clock, CheckCircle, Star } from 'lucide-react'

export default async function StudenteTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: enrollment } = await supabase
    .from('course_enrollments')
    .select('status')
    .eq('course_id', id)
    .eq('student_id', user.id)
    .single()

  if (!enrollment) notFound()

  // Find student's group in this course
  const { data: myGroup } = await supabase
    .from('course_group_members')
    .select('group_id')
    .eq('student_id', user.id)
    .in('group_id',
      (await supabase.from('course_groups').select('id').eq('course_id', id)).data?.map(g => g.id) ?? []
    )
    .maybeSingle()

  const [
    { data: course },
    { data: tasks },
    { data: mySubmissions },
  ] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', id).single(),
    supabase.from('course_tasks')
      .select('id, title, description, due_date, group_id, course_groups(name)')
      .eq('course_id', id)
      .or(myGroup?.group_id
        ? `group_id.is.null,group_id.eq.${myGroup.group_id}`
        : 'group_id.is.null'
      )
      .order('created_at', { ascending: false }),
    supabase.from('task_submissions')
      .select('task_id, grade, feedback, submitted_at')
      .eq('student_id', user.id),
  ])

  if (!course) notFound()

  type Task = {
    id: string; title: string; description: string | null; due_date: string | null
    group_id: string | null; course_groups: { name: string } | null
  }
  type MySub = { task_id: string; grade: string | null; feedback: string | null; submitted_at: string }

  const subMap = new Map((mySubmissions as MySub[] ?? []).map(s => [s.task_id, s]))
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href={`/studente/corsi/${id}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
        >
          <ArrowLeft size={15} /> {course.name}
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">I miei task</h2>
        <p className="text-gray-500 text-sm mt-1">{tasks?.length ?? 0} task assegnati</p>
      </div>

      <div className="space-y-3">
        {(tasks as unknown as Task[] ?? []).map(task => {
          const sub = subMap.get(task.id)
          const isOverdue = task.due_date && task.due_date < today && !sub
          const group = task.course_groups as { name: string } | null

          return (
            <Link
              key={task.id}
              href={`/studente/corsi/${id}/task/${task.id}`}
              className="block bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-blue-300 transition group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition">{task.title}</p>
                  {task.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    {group && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">
                        {group.name}
                      </span>
                    )}
                    {task.due_date && (
                      <span className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                        <Clock size={11} />
                        {new Date(task.due_date).toLocaleDateString('it-IT')}
                        {isOverdue && ' — Scaduto'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {sub ? (
                    <>
                      <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-lg">
                        <CheckCircle size={11} /> Consegnato
                      </span>
                      {sub.grade && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg">
                          <Star size={11} /> {sub.grade}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                      {isOverdue ? 'Scaduto' : 'Da consegnare'}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}

        {(!tasks || tasks.length === 0) && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <ClipboardList size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nessun task assegnato</p>
            <p className="text-gray-400 text-sm mt-1">Il docente non ha ancora assegnato task.</p>
          </div>
        )}
      </div>
    </div>
  )
}
