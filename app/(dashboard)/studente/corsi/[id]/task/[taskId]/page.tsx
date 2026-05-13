import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Clock, Star, CheckCircle, FileText, AlertCircle } from 'lucide-react'
import SubmitTaskForm from './SubmitTaskForm'
import FeedbackThread from './FeedbackThread'

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
    supabase.from('courses').select('id, name, grading_scale').eq('id', id).single(),
    supabase.from('course_tasks')
      .select('id, title, description, due_date, student_id, group_id, referente_id, require_file, accepted_formats, grade_visible, course_groups(name)')
      .eq('id', taskId)
      .eq('course_id', id)
      .single(),
    supabase.from('task_submissions')
      .select('id, file_url, file_name, file_size, file_deleted_at, notes, submitted_at, status, grade, grade_decimal, feedback, version_number')
      .eq('task_id', taskId)
      .eq('student_id', user.id)
      .maybeSingle(),
  ])

  if (!course || !task) notFound()

  if (task.student_id && task.student_id !== user.id) notFound()

  const today = new Date().toISOString().split('T')[0]
  const isOverdue = task.due_date && task.due_date < today
  const group = task.course_groups as unknown as { name: string } | null
  const gradingScale = (course as unknown as { grading_scale?: number })?.grading_scale ?? 10

  type Submission = {
    id: string; file_url: string | null; file_name: string | null; file_size: number | null
    file_deleted_at: string | null; notes: string | null; submitted_at: string; status: string
    grade: string | null; grade_decimal: number | null; feedback: string | null; version_number: number
  }
  const sub = submission as Submission | null

  const isValutato = sub?.status === 'valutato'
  const gradeVisible = task.grade_visible ?? false
  const gradeDisplay = sub?.grade_decimal != null ? (sub.grade_decimal * (gradingScale / 10)).toFixed(1) : null
  const hasFeedbackThread = !!(task.student_id || task.group_id)
  const isReferente = !task.group_id || task.referente_id === user.id || !task.referente_id
  const acceptedFormats: string[] = (task.accepted_formats as string[] | null) ?? ['pdf', 'pptx', 'xlsx']
  const requireFile = task.require_file ?? true

  // Referente check for microgruppo: non-referente can see thread but not upload
  const canSubmit = task.group_id ? isReferente : true

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/studente/corsi/${id}/task`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
        >
          <ArrowLeft size={15} /> Le mie task
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
          {sub && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              sub.status === 'valutato' ? 'bg-green-100 text-green-700' :
              sub.status === 'in_revisione' ? 'bg-amber-100 text-amber-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {sub.status === 'valutato' ? 'Valutato' :
               sub.status === 'in_revisione' ? 'In revisione' : 'Consegnato'}
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

      {/* Valutazione (solo se grade_visible = true) */}
      {isValutato && gradeVisible && gradeDisplay && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Star size={14} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-900">Valutazione ricevuta</p>
          </div>
          <p className="text-2xl font-bold text-amber-800">{gradeDisplay}/{gradingScale}</p>
          {sub?.feedback && (
            <p className="text-sm text-amber-700 bg-amber-100 rounded-lg px-3 py-2">{sub.feedback}</p>
          )}
        </div>
      )}

      {/* Task valutata senza voto condiviso */}
      {isValutato && !gradeVisible && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 flex items-center gap-3">
          <CheckCircle size={15} className="text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800">
            Il tuo lavoro è stato valutato. Il docente non ha condiviso il voto.
          </p>
        </div>
      )}

      {/* Consegna esistente */}
      {sub && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle size={15} className="text-green-600" />
            <p className="text-sm font-semibold text-gray-900">La tua consegna</p>
            <span className="ml-auto text-xs text-gray-400">
              v{sub.version_number} · {new Date(sub.submitted_at).toLocaleDateString('it-IT', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </span>
          </div>
          {sub.notes && (
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{sub.notes}</p>
          )}
          {sub.file_deleted_at ? (
            <p className="text-xs text-gray-400 italic">File rimosso dopo la valutazione.</p>
          ) : sub.file_url ? (
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
          ) : null}
        </div>
      )}

      {/* Feedback thread (singolo + microgruppo) */}
      {hasFeedbackThread && sub && (
        <FeedbackThread submissionId={sub.id} isValutato={isValutato} />
      )}

      {/* Microgruppo non-referente: solo lettura */}
      {task.group_id && !isReferente && !isValutato && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-sm text-blue-800">
          Solo il referente del gruppo può caricare il file. Puoi seguire il thread feedback sopra.
        </div>
      )}

      {/* Upload form */}
      {!isValutato && canSubmit && (
        isOverdue && !sub ? (
          <div className="bg-red-50 rounded-xl border border-red-200 p-5 flex items-start gap-3">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Task scaduta</p>
              <p className="text-sm text-red-600 mt-0.5">
                Il termine era il {new Date(task.due_date!).toLocaleDateString('it-IT')}. Contatta il docente per una proroga.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-900 mb-4">
              {sub ? `Aggiorna la consegna (versione ${(sub.version_number ?? 0) + 1})` : 'Carica il tuo lavoro'}
            </p>
            <SubmitTaskForm
              taskId={taskId}
              courseId={id}
              hasExisting={!!sub}
              requireFile={requireFile}
              acceptedFormats={acceptedFormats}
              versionNumber={sub?.version_number ?? 0}
            />
          </div>
        )
      )}
    </div>
  )
}
