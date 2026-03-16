import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ClipboardList, Clock, CheckCircle, Star, BookOpen } from 'lucide-react'

export default async function StudenteTaskGlobale() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('course_id, courses(id, name)')
    .eq('student_id', user.id)
    .eq('status', 'active')

  const courseMap = new Map<string, string>()
  for (const e of enrollments ?? []) {
    const c = e.courses as unknown as { id: string; name: string } | null
    if (c) courseMap.set(c.id, c.name)
  }
  const courseIds = [...courseMap.keys()]

  if (courseIds.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">I Miei Task</h2>
          <p className="text-gray-500 text-sm mt-1">Nessun corso attivo.</p>
        </div>
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ClipboardList size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Non sei iscritto a nessun corso</p>
        </div>
      </div>
    )
  }

  // Find student groups for each course (two-step: course_groups → course_group_members)
  const { data: courseGroupsData } = await supabase
    .from('course_groups')
    .select('id, course_id')
    .in('course_id', courseIds)

  const allGroupIds = (courseGroupsData ?? []).map(g => g.id)
  const { data: myMemberships } = allGroupIds.length > 0
    ? await supabase
        .from('course_group_members')
        .select('group_id')
        .eq('student_id', user.id)
        .in('group_id', allGroupIds)
    : { data: [] }

  const myGroupIds = new Set((myMemberships ?? []).map(m => m.group_id))
  const groupToCourse = new Map<string, string>()
  for (const g of courseGroupsData ?? []) {
    groupToCourse.set(g.id, g.course_id)
  }

  // Build filter per course: null OR my group_id
  // Fetch all tasks visible to this student
  const { data: allTasks } = await supabase
    .from('course_tasks')
    .select('id, title, description, due_date, course_id, group_id, course_groups(name)')
    .in('course_id', courseIds)
    .order('due_date', { ascending: true, nullsFirst: false })

  // Filter: task group_id is null OR belongs to student's group in that course
  type Task = {
    id: string; title: string; description: string | null; due_date: string | null
    course_id: string; group_id: string | null; course_groups: { name: string } | null
  }
  const tasks = ((allTasks as unknown as Task[]) ?? []).filter(t =>
    t.group_id === null || myGroupIds.has(t.group_id)
  )

  const taskIds = tasks.map(t => t.id)
  const { data: mySubmissions } = taskIds.length > 0
    ? await supabase
        .from('task_submissions')
        .select('task_id, grade, submitted_at')
        .eq('student_id', user.id)
        .in('task_id', taskIds)
    : { data: [] }

  type Sub = { task_id: string; grade: string | null; submitted_at: string }
  const subMap = new Map((mySubmissions as Sub[] ?? []).map(s => [s.task_id, s]))

  const today = new Date().toISOString().split('T')[0]

  const overdue = tasks.filter(t => t.due_date && t.due_date < today && !subMap.has(t.id))
  const pending = tasks.filter(t => (!t.due_date || t.due_date >= today) && !subMap.has(t.id))
  const submitted = tasks.filter(t => subMap.has(t.id))

  function TaskCard({ task }: { task: Task }) {
    const sub = subMap.get(task.id)
    const isOverdue = task.due_date && task.due_date < today && !sub
    const group = task.course_groups as { name: string } | null
    return (
      <Link
        href={`/studente/corsi/${task.course_id}/task/${task.id}`}
        className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition group"
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${sub?.grade ? 'bg-amber-50' : sub ? 'bg-green-50' : isOverdue ? 'bg-red-50' : 'bg-gray-100'}`}>
          {sub?.grade
            ? <Star size={15} className="text-amber-500" />
            : sub
            ? <CheckCircle size={15} className="text-green-500" />
            : <ClipboardList size={15} className={isOverdue ? 'text-red-400' : 'text-gray-400'} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition truncate">
              {task.title}
            </p>
            {group && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700 flex-shrink-0">
                {group.name}
              </span>
            )}
          </div>
          <p className="text-xs text-blue-600 font-medium mt-0.5">
            <BookOpen size={9} className="inline mr-1" />
            {courseMap.get(task.course_id)}
          </p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {task.due_date && (
              <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                <Clock size={9} />
                {new Date(task.due_date).toLocaleDateString('it-IT')}
                {isOverdue && ' — Scaduto'}
              </span>
            )}
            {sub && (
              <span className="text-xs text-green-600">
                Consegnato il {new Date(sub.submitted_at).toLocaleDateString('it-IT')}
              </span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 self-center">
          {sub?.grade ? (
            <span className="flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
              <Star size={10} /> {sub.grade}
            </span>
          ) : sub ? (
            <span className="flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
              <CheckCircle size={10} /> Consegnato
            </span>
          ) : isOverdue ? (
            <span className="text-xs font-semibold bg-red-100 text-red-600 px-2.5 py-1 rounded-full">Scaduto</span>
          ) : (
            <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">Da consegnare</span>
          )}
        </div>
      </Link>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">I Miei Task</h2>
        <p className="text-gray-500 text-sm mt-1">
          {tasks.length} task · {submitted.length} consegnati
          {overdue.length > 0 && (
            <span className="text-red-500 font-semibold"> · {overdue.length} scaduti</span>
          )}
        </p>
      </div>

      {/* Scaduti */}
      {overdue.length > 0 && (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-red-100 bg-red-50 flex items-center gap-2">
            <Clock size={14} className="text-red-500" />
            <h3 className="font-semibold text-red-800 text-sm">Scaduti</h3>
            <span className="ml-auto text-xs bg-red-200 text-red-700 px-2 py-0.5 rounded-full font-medium">
              {overdue.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {overdue.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {/* Da consegnare */}
      {pending.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
            <ClipboardList size={14} className="text-gray-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Da consegnare</h3>
            <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
              {pending.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {pending.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {/* Consegnati */}
      {submitted.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
            <CheckCircle size={14} className="text-green-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Consegnati</h3>
            <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              {submitted.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {submitted.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ClipboardList size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nessun task assegnato</p>
          <p className="text-gray-400 text-sm mt-1">I docenti non hanno ancora assegnato task.</p>
        </div>
      )}
    </div>
  )
}
