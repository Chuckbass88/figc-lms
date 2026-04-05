import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClipboardCheck, Clock, Users, CheckCircle, AlertTriangle } from 'lucide-react'
import GuideTooltip from '@/components/guida/GuideTooltip'

export default async function DocenteTaskGlobale() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myCoursesData } = await supabase
    .from('course_instructors')
    .select('course_id, courses(id, name)')
    .eq('instructor_id', user.id)

  const courseMap = new Map<string, string>()
  for (const r of myCoursesData ?? []) {
    const c = r.courses as unknown as { id: string; name: string } | null
    if (c) courseMap.set(c.id, c.name)
  }
  const courseIds = [...courseMap.keys()]

  const [
    { data: tasks },
    { data: enrollments },
  ] = await Promise.all([
    courseIds.length > 0
      ? supabase
          .from('course_tasks')
          .select('id, title, description, due_date, course_id, group_id, created_at, course_groups(name)')
          .in('course_id', courseIds)
          .order('due_date', { ascending: true, nullsFirst: false })
      : Promise.resolve({ data: [] }),
    courseIds.length > 0
      ? supabase
          .from('course_enrollments')
          .select('course_id, student_id')
          .in('course_id', courseIds)
          .eq('status', 'active')
      : Promise.resolve({ data: [] }),
  ])

  const taskIds = (tasks ?? []).map(t => t.id)
  const { data: submissions } = taskIds.length > 0
    ? await supabase
        .from('task_submissions')
        .select('task_id, grade')
        .in('task_id', taskIds)
    : { data: [] }

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

  type Task = {
    id: string; title: string; description: string | null; due_date: string | null
    course_id: string; group_id: string | null; course_groups: { name: string } | null
  }
  const allTasks = tasks as Task[] ?? []

  const upcoming = allTasks.filter(t => !t.due_date || t.due_date >= today)
  const overdue = allTasks.filter(t => t.due_date && t.due_date < today)

  const totalPending = allTasks.reduce((sum, t) => {
    const subs = subsByTask.get(t.id) ?? []
    return sum + subs.filter(s => !s.grade).length
  }, 0)

  function TaskRow({ task }: { task: Task }) {
    const subs = subsByTask.get(task.id) ?? []
    const subCount = subs.length
    const gradedCount = subs.filter(s => s.grade).length
    const pendingCount = subCount - gradedCount
    const studentCount = enrollByCourse.get(task.course_id) ?? 0
    const isOverdue = task.due_date && task.due_date < today
    const group = task.course_groups as { name: string } | null

    return (
      <Link
        href={`/docente/corsi/${task.course_id}/task/${task.id}`}
        className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition group"
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-50' : 'bg-amber-50'}`}>
          <ClipboardCheck size={16} className={isOverdue ? 'text-red-400' : 'text-amber-600'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition truncate">{task.title}</p>
            {group && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700 flex-shrink-0">
                {group.name}
              </span>
            )}
          </div>
          <p className="text-xs text-blue-600 font-medium mt-0.5 truncate">{courseMap.get(task.course_id)}</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {task.due_date && (
              <span className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                <Clock size={10} />
                {new Date(task.due_date).toLocaleDateString('it-IT')}
                {isOverdue && ' — Scaduto'}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Users size={10} /> {subCount}/{studentCount} consegne
            </span>
            {gradedCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle size={10} /> {gradedCount} valutati
              </span>
            )}
          </div>
        </div>
        {pendingCount > 0 && (
          <span className="flex-shrink-0 self-center text-xs font-bold bg-red-100 text-red-600 px-2.5 py-1 rounded-full">
            {pendingCount} da valutare
          </span>
        )}
        {pendingCount === 0 && subCount > 0 && (
          <span className="flex-shrink-0 self-center text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full flex items-center gap-1">
            <CheckCircle size={10} /> Ok
          </span>
        )}
      </Link>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-gray-900">Le Mie Task</h2>
          <GuideTooltip
            title="✅ Valutare le Task"
            content="Qui trovi tutti i compiti consegnati dagli studenti. Clicca su una task per vedere le consegne, aprire i file e assegnare un voto con commento. Il badge rosso indica quante valutazioni sono ancora in sospeso."
            position="bottom"
          />
        </div>
        <p className="text-gray-500 text-sm mt-1">
          {allTasks.length} task su {courseIds.length} {courseIds.length === 1 ? 'corso' : 'corsi'}
          {totalPending > 0 && <span className="text-red-500 font-semibold"> · {totalPending} valutazioni in sospeso</span>}
        </p>
      </div>

      {overdue.length > 0 && (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-red-100 flex items-center gap-2 bg-red-50">
            <AlertTriangle size={14} className="text-red-500" />
            <h3 className="font-semibold text-red-800 text-sm">Task scaduti</h3>
            <span className="ml-auto text-xs bg-red-200 text-red-700 px-2 py-0.5 rounded-full font-medium">
              {overdue.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {overdue.map(task => <TaskRow key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
            <ClipboardCheck size={14} className="text-amber-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Task attivi</h3>
            <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {upcoming.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {upcoming.map(task => <TaskRow key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {allTasks.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ClipboardCheck size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nessun task creato</p>
          <p className="text-gray-400 text-sm mt-1">Vai in un corso per creare il primo task.</p>
          <Link href="/docente/corsi" className="text-sm text-blue-600 hover:underline mt-3 inline-block">
            Vai ai miei corsi →
          </Link>
        </div>
      )}
    </div>
  )
}
