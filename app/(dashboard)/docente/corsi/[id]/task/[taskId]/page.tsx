import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Clock, Users, ClipboardList, Link2, Paperclip, FileText, Download } from 'lucide-react'
import EliminaTaskBtn from './EliminaTaskBtn'
import ModificaTaskBtn from './ModificaTaskBtn'
import EsportaTaskCSV from './EsportaTaskCSV'
import ConsegneList from './ConsegneList'

export default async function DocenteTaskDetailPage({ params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { id, taskId } = await params
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
    { data: task },
    { data: enrollments },
    { data: submissions },
  ] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', id).single(),
    supabase.from('course_tasks').select('*, course_groups(name)').eq('id', taskId).eq('course_id', id).single(),
    supabase.from('course_enrollments')
      .select('student_id, profiles(id, full_name, email)')
      .eq('course_id', id)
      .eq('status', 'active'),
    supabase.from('task_submissions')
      .select('id, student_id, file_url, file_name, file_size, notes, submitted_at, grade, feedback')
      .eq('task_id', taskId),
  ])

  if (!course || !task) notFound()

  type Enrollment = { student_id: string; profiles: { id: string; full_name: string; email: string } | null }
  type Submission = {
    id: string; student_id: string; file_url: string | null; file_name: string | null
    file_size: number | null; notes: string | null; submitted_at: string
    grade: string | null; feedback: string | null
  }

  let students = (enrollments as unknown as Enrollment[] ?? [])
    .map(e => e.profiles)
    .filter(Boolean) as { id: string; full_name: string; email: string }[]

  // Filtra per destinatario specifico
  if (task.student_id) {
    students = students.filter(s => s.id === task.student_id)
  } else if (task.group_id) {
    const { data: groupMembers } = await supabase
      .from('course_group_members')
      .select('student_id')
      .eq('group_id', task.group_id)
    const memberIds = new Set((groupMembers ?? []).map((m: { student_id: string }) => m.student_id))
    students = students.filter(s => memberIds.has(s.id))
  }

  const submissionMap = new Map((submissions as Submission[] ?? []).map(s => [s.student_id, s]))

  const today = new Date().toISOString().split('T')[0]
  const isOverdue = task.due_date && task.due_date < today
  const group = task.course_groups as { name: string } | null

  const submittedCount = submissions?.length ?? 0
  const evaluatedCount = (submissions as Submission[] ?? []).filter(s => s.grade).length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href={`/docente/corsi/${id}/task`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
        >
          <ArrowLeft size={15} /> Task del corso
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
        {task.description && (
          <p className="text-gray-500 text-sm mt-1">{task.description}</p>
        )}
        <div className="flex items-center gap-3 mt-3 flex-wrap justify-between">
          <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${task.student_id ? 'bg-green-100 text-green-700' : group ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
            {task.student_id ? `Corsista: ${students[0]?.full_name ?? '—'}` : group ? group.name : 'Tutto il corso'}
          </span>
          {task.due_date && (
            <span className={`flex items-center gap-1.5 text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
              <Clock size={12} />
              Scadenza: {new Date(task.due_date).toLocaleDateString('it-IT')}
              {isOverdue && ' — Scaduto'}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <Users size={12} /> {submittedCount}/{students.length} consegnati
          </span>
          {evaluatedCount > 0 && (
            <span className="text-xs text-green-600 font-medium">{evaluatedCount} valutati</span>
          )}
          </div>
          <div className="flex items-center gap-2">
            <ModificaTaskBtn
              taskId={taskId}
              initialTitle={task.title}
              initialDescription={task.description ?? null}
              initialDueDate={task.due_date ?? null}
            />
            <EliminaTaskBtn taskId={taskId} courseId={id} />
          </div>
        </div>
      </div>

      {/* Dettaglio task */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <ClipboardList size={15} className="text-amber-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Dettaglio task</h3>
        </div>
        {task.description ? (
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{task.description}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">Nessuna descrizione fornita.</p>
        )}
        {task.attachment_url && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Paperclip size={11} /> Allegato docente
            </p>
            <a
              href={task.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2 hover:bg-blue-100 transition"
            >
              {task.attachment_type === 'link' ? <Link2 size={13} /> : <FileText size={13} />}
              <span className="truncate max-w-[300px]">{task.attachment_name ?? task.attachment_url}</span>
              {task.attachment_type === 'file' && <Download size={11} className="flex-shrink-0" />}
            </a>
          </div>
        )}
      </div>

      {/* Student list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users size={15} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Corsisti</h3>
          <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {students.length}
          </span>
          {students.length > 0 && (
            <EsportaTaskCSV
              taskTitle={task.title}
              rows={students.map(s => {
                const sub = submissionMap.get(s.id)
                return {
                  full_name: s.full_name,
                  email: s.email,
                  submitted: !!sub,
                  submitted_at: sub?.submitted_at ?? null,
                  file_name: sub?.file_name ?? null,
                  file_url: sub?.file_url ?? null,
                  notes: sub?.notes ?? null,
                  grade: sub?.grade ?? null,
                  feedback: sub?.feedback ?? null,
                }
              })}
            />
          )}
        </div>
        <ConsegneList
          students={students}
          submissionMap={Object.fromEntries(submissionMap)}
          taskTitle={task.title}
        />
      </div>
    </div>
  )
}
