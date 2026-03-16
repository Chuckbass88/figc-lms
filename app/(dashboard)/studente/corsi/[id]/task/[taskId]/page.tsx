import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Clock, Star, CheckCircle, FileText, MessageSquare } from 'lucide-react'
import SubmitTaskForm from './SubmitTaskForm'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function StudenteTaskDetailPage({ params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { id, taskId } = await params
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

  const [
    { data: course },
    { data: task },
    { data: submission },
  ] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', id).single(),
    supabase.from('course_tasks')
      .select('id, title, description, due_date, course_groups(name)')
      .eq('id', taskId)
      .eq('course_id', id)
      .single(),
    supabase.from('task_submissions')
      .select('id, file_url, file_name, file_size, notes, submitted_at, grade, feedback')
      .eq('task_id', taskId)
      .eq('student_id', user.id)
      .maybeSingle(),
  ])

  if (!course || !task) notFound()

  const today = new Date().toISOString().split('T')[0]
  const isOverdue = task.due_date && task.due_date < today
  const group = task.course_groups as unknown as { name: string } | null

  type Submission = {
    id: string; file_url: string | null; file_name: string | null; file_size: number | null
    notes: string | null; submitted_at: string; grade: string | null; feedback: string | null
  }
  const sub = submission as Submission | null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/studente/corsi/${id}/task`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
        >
          <ArrowLeft size={15} /> I miei task
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
        {task.description && (
          <p className="text-gray-500 text-sm mt-2">{task.description}</p>
        )}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {group && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-indigo-100 text-indigo-700">
              {group.name}
            </span>
          )}
          {task.due_date && (
            <span className={`flex items-center gap-1.5 text-xs font-medium ${isOverdue && !sub ? 'text-red-500' : 'text-gray-500'}`}>
              <Clock size={12} />
              Scadenza: {new Date(task.due_date).toLocaleDateString('it-IT')}
              {isOverdue && !sub && ' — Scaduto'}
            </span>
          )}
        </div>
      </div>

      {/* Feedback received */}
      {sub?.grade && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Star size={14} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-900">Valutazione ricevuta</p>
          </div>
          <p className="text-xl font-bold text-amber-800">{sub.grade}</p>
          {sub.feedback && (
            <p className="text-sm text-amber-700 bg-amber-100 rounded-lg px-3 py-2">{sub.feedback}</p>
          )}
        </div>
      )}

      {/* Existing submission */}
      {sub && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle size={15} className="text-green-600" />
            <p className="text-sm font-semibold text-gray-900">La tua consegna</p>
            <span className="ml-auto text-xs text-gray-400">
              {new Date(sub.submitted_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {sub.notes && (
            <div className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
              <MessageSquare size={13} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <span>{sub.notes}</span>
            </div>
          )}
          {sub.file_url && (
            <a
              href={sub.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2.5 hover:bg-blue-100 transition w-fit"
            >
              <FileText size={14} />
              <span className="truncate max-w-[250px]">{sub.file_name ?? 'File allegato'}</span>
              {sub.file_size && <span className="text-blue-400 flex-shrink-0">· {formatSize(sub.file_size)}</span>}
            </a>
          )}
        </div>
      )}

      {/* Upload form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-900 mb-4">
          {sub ? 'Aggiorna la consegna' : 'Carica il tuo lavoro'}
        </p>
        <SubmitTaskForm taskId={taskId} courseId={id} hasExisting={!!sub} />
      </div>
    </div>
  )
}
