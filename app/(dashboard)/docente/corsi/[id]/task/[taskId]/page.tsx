import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Clock, Users, FileText, Download, MessageSquare } from 'lucide-react'
import ValutaBtn from './ValutaBtn'
import EliminaTaskBtn from './EliminaTaskBtn'
import ModificaTaskBtn from './ModificaTaskBtn'
import EsportaTaskCSV from './EsportaTaskCSV'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function DocenteTaskDetailPage({ params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { id, taskId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: isInstructor } = await supabase
    .from('course_instructors')
    .select('instructor_id')
    .eq('course_id', id)
    .eq('instructor_id', user.id)
    .single()

  if (!isInstructor) notFound()

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

  const students = (enrollments as unknown as Enrollment[] ?? [])
    .map(e => e.profiles)
    .filter(Boolean) as { id: string; full_name: string; email: string }[]

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
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${group ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
            {group ? group.name : 'Tutto il corso'}
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
        <div className="divide-y divide-gray-50">
          {students.map(student => {
            const sub = submissionMap.get(student.id)
            return (
              <div key={student.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {student.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{student.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">{student.email}</p>
                    </div>
                  </div>
                  {sub ? (
                    <ValutaBtn
                      submissionId={sub.id}
                      studentId={student.id}
                      taskTitle={task.title}
                      initialGrade={sub.grade}
                      initialFeedback={sub.feedback}
                    />
                  ) : (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg flex-shrink-0">
                      Non consegnato
                    </span>
                  )}
                </div>

                {sub && (
                  <div className="mt-3 ml-11 space-y-2">
                    <p className="text-xs text-gray-400">
                      Consegnato il {new Date(sub.submitted_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {sub.notes && (
                      <div className="flex items-start gap-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                        <MessageSquare size={12} className="text-gray-400 flex-shrink-0 mt-0.5" />
                        <span>{sub.notes}</span>
                      </div>
                    )}
                    {sub.file_url && (
                      <a
                        href={sub.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 hover:bg-blue-100 transition w-fit"
                      >
                        <FileText size={12} />
                        <span className="truncate max-w-[200px]">{sub.file_name ?? 'File allegato'}</span>
                        {sub.file_size && <span className="text-blue-400 flex-shrink-0">· {formatSize(sub.file_size)}</span>}
                        <Download size={11} className="flex-shrink-0" />
                      </a>
                    )}
                    {sub.grade && (
                      <div className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                        <span className="font-semibold">Voto:</span> {sub.grade}
                        {sub.feedback && <span className="ml-2 text-gray-500">· {sub.feedback}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {students.length === 0 && (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">Nessun corsista iscritto al corso.</p>
          )}
        </div>
      </div>
    </div>
  )
}
