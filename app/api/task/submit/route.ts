import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const ACCEPTED_EXTENSIONS = ['pdf', 'pptx', 'xlsx']
const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
]

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const rl = checkRateLimit(`${user.id}:upload`, RATE_LIMITS.upload)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Troppi upload in poco tempo. Riprova tra qualche secondo.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  const formData = await request.formData()
  const taskId   = formData.get('task_id') as string
  const notes    = formData.get('notes') as string
  const file     = formData.get('file') as File | null

  if (!taskId) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  // Carica task per verificare deadline e regole
  const { data: task } = await supabase
    .from('course_tasks')
    .select('due_date, require_file, accepted_formats, group_id, student_id, referente_id, course_id')
    .eq('id', taskId)
    .single()

  if (!task) return NextResponse.json({ error: 'Task non trovata' }, { status: 404 })

  // Verifica autorizzazione upload
  if (task.student_id && task.student_id !== user.id) {
    return NextResponse.json({ error: 'Non autorizzato a questa task' }, { status: 403 })
  }
  if (task.group_id && task.referente_id && task.referente_id !== user.id) {
    return NextResponse.json({ error: 'Solo il referente del gruppo può caricare il file' }, { status: 403 })
  }

  // Verifica deadline
  const { data: existingSub } = await supabase
    .from('task_submissions')
    .select('id, storage_path, version_number, deadline_extended')
    .eq('task_id', taskId)
    .eq('student_id', user.id)
    .single()

  if (task.due_date) {
    const deadline = existingSub?.deadline_extended
      ? new Date(existingSub.deadline_extended)
      : new Date(task.due_date)
    deadline.setHours(23, 59, 59, 999)
    if (new Date() > deadline) {
      return NextResponse.json({ error: 'La deadline è scaduta. Contatta il docente per richiedere una proroga.' }, { status: 400 })
    }
  }

  // Verifica file se richiesto
  if (task.require_file && (!file || file.size === 0)) {
    return NextResponse.json({ error: 'Il docente richiede un file allegato per questa task.' }, { status: 400 })
  }

  let fileUrl: string | null = null
  let fileName: string | null = null
  let fileSize: number | null = null
  let storagePath: string | null = null

  if (file && file.size > 0) {
    // Verifica formato
    const ext = (file.name.split('.').pop() ?? '').toLowerCase()
    const allowedFormats: string[] = task.accepted_formats ?? ACCEPTED_EXTENSIONS
    if (!allowedFormats.includes(ext) && !ACCEPTED_MIME.includes(file.type)) {
      return NextResponse.json(
        { error: `Formato non accettato. Formati consentiti: ${allowedFormats.map(f => f.toUpperCase()).join(', ')}` },
        { status: 400 }
      )
    }

    // Elimina file precedente dallo storage se esiste
    if (existingSub?.storage_path) {
      await admin.storage.from('task-submissions').remove([existingSub.storage_path])
    }

    // Path fisso per studente+task (upsert sovrascrive)
    storagePath = `${taskId}/${user.id}/submission.${ext}`

    const { error: uploadError } = await admin.storage
      .from('task-submissions')
      .upload(storagePath, file, { contentType: file.type, upsert: true })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: urlData } = admin.storage.from('task-submissions').getPublicUrl(storagePath)
    fileUrl  = urlData.publicUrl
    fileName = file.name
    fileSize = file.size
  }

  const newVersion = (existingSub?.version_number ?? 0) + 1

  const { data, error } = await admin
    .from('task_submissions')
    .upsert({
      task_id:        taskId,
      student_id:     user.id,
      file_url:       fileUrl,
      file_name:      fileName,
      file_size:      fileSize,
      storage_path:   storagePath ?? existingSub?.storage_path ?? null,
      notes:          notes?.trim() || null,
      submitted_at:   new Date().toISOString(),
      status:         'consegnato',
      version_number: newVersion,
      file_deleted_at: null,
    }, { onConflict: 'task_id,student_id' })
    .select()
    .single()

  if (error) {
    if (storagePath) await admin.storage.from('task-submissions').remove([storagePath])
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/studente/corsi/[id]/task', 'page')
  return NextResponse.json({ submission: data })
}
