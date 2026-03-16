import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClipboardCheck, Clock, Users, CheckCircle, ArrowRight } from 'lucide-react'

export default async function AdminTaskPage() {
  const supabase = await createClient()

  const [
    { data: tasks },
    { data: courses },
  ] = await Promise.all([
    supabase
      .from('course_tasks')
      .select('id, title, description, due_date, course_id, group_id, created_at, course_groups(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('courses')
      .select('id, name')
      .order('name'),
  ])

  const taskIds = (tasks ?? []).map(t => t.id)

  // Submissions per task
  const { data: submissions } = taskIds.length > 0
    ? await supabase
        .from('task_submissions')
        .select('task_id, grade')
        .in('task_id', taskIds)
    : { data: [] }

  // Enrollments per course (for total students per task)
  const courseIds = [...new Set((tasks ?? []).map(t => t.course_id))]
  const { data: enrollments } = courseIds.length > 0
    ? await supabase
        .from('course_enrollments')
        .select('course_id, student_id')
        .in('course_id', courseIds)
        .eq('status', 'active')
    : { data: [] }

  const courseNameMap = new Map((courses ?? []).map(c => [c.id, c.name]))
  const enrollByCourse = new Map<string, number>()
  for (const e of enrollments ?? []) {
    enrollByCourse.set(e.course_id, (enrollByCourse.get(e.course_id) ?? 0) + 1)
  }

  type Sub = { task_id: string; grade: string | null }
  const subsByTask = new Map<string, Sub[]>()
  for (const s of submissions as Sub[] ?? []) {
    if (!subsByTask.has(s.task_id)) subsByTask.set(s.task_id, [])
    subsByTask.get(s.task_id)!.push(s)
  }

  const today = new Date().toISOString().split('T')[0]

  // Group tasks by course
  type TaskRow = {
    id: string; title: string; description: string | null; due_date: string | null
    course_id: string; group_id: string | null; course_groups: { name: string } | null
  }
  const tasksByCourse = new Map<string, TaskRow[]>()
  for (const task of tasks as unknown as TaskRow[] ?? []) {
    if (!tasksByCourse.has(task.course_id)) tasksByCourse.set(task.course_id, [])
    tasksByCourse.get(task.course_id)!.push(task)
  }

  const totalTasks = tasks?.length ?? 0
  const totalSubs = submissions?.length ?? 0
  const totalGraded = (submissions as Sub[] ?? []).filter(s => s.grade).length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Panoramica Task</h2>
        <p className="text-gray-500 text-sm mt-1">{totalTasks} task · {totalSubs} consegne · {totalGraded} valutate</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-gray-900">{totalTasks}</p>
          <p className="text-sm text-gray-500 font-medium mt-1">Task totali</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
          <p className="text-3xl font-bold text-blue-700">{totalSubs}</p>
          <p className="text-sm text-gray-500 font-medium mt-1">Consegne ricevute</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
          <p className={`text-3xl font-bold ${totalSubs - totalGraded > 0 ? 'text-red-600' : 'text-green-700'}`}>
            {totalSubs - totalGraded}
          </p>
          <p className="text-sm text-gray-500 font-medium mt-1">In attesa di valutazione</p>
        </div>
      </div>

      {/* Tasks by course */}
      {[...tasksByCourse.entries()].map(([courseId, courseTasks]) => {
        const courseName = courseNameMap.get(courseId) ?? 'Corso sconosciuto'
        const studentCount = enrollByCourse.get(courseId) ?? 0
        return (
          <div key={courseId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/super-admin/corsi/${courseId}`}
                  className="font-semibold text-gray-900 text-sm hover:text-blue-700 transition"
                >
                  {courseName}
                </Link>
              </div>
              <span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                <Users size={11} /> {studentCount} corsisti
              </span>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                {courseTasks.length} task
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {courseTasks.map(task => {
                const subs = subsByTask.get(task.id) ?? []
                const subCount = subs.length
                const gradedCount = subs.filter(s => s.grade).length
                const pendingCount = subCount - gradedCount
                const isOverdue = task.due_date && task.due_date < today
                const group = task.course_groups as { name: string } | null
                const pct = studentCount > 0 ? Math.round((subCount / studentCount) * 100) : 0

                return (
                  <div key={task.id} className="px-5 py-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                        {group && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">
                            {group.name}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
                      )}
                      {task.due_date && (
                        <p className={`text-xs mt-1 flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                          <Clock size={10} />
                          {new Date(task.due_date).toLocaleDateString('it-IT')}
                          {isOverdue && ' — Scaduto'}
                        </p>
                      )}
                      {/* Progress bar */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                          <div
                            className={`h-full rounded-full ${pct >= 75 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-400' : 'bg-gray-300'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{subCount}/{studentCount} consegne</span>
                        {gradedCount > 0 && (
                          <span className="text-xs text-green-600 flex items-center gap-0.5">
                            <CheckCircle size={10} /> {gradedCount} valutati
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {pendingCount > 0 && (
                        <span className="text-xs font-bold bg-red-100 text-red-600 px-2.5 py-1 rounded-full">
                          {pendingCount} da valutare
                        </span>
                      )}
                      {pendingCount === 0 && subCount > 0 && (
                        <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle size={10} /> Tutti valutati
                        </span>
                      )}
                      <Link
                        href={`/docente/corsi/${courseId}/task/${task.id}`}
                        className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-700 transition"
                        title="Apri dettaglio task"
                      >
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {(!tasks || tasks.length === 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ClipboardCheck size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nessun task creato</p>
          <p className="text-gray-400 text-sm mt-1">I docenti non hanno ancora assegnato task ai corsi.</p>
        </div>
      )}
    </div>
  )
}
