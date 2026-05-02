import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

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
  const taskId = formData.get('task_id') as string
  const notes = formData.get('notes') as string
  const file = formData.get('file') as File | null

  if (!taskId) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  let fileUrl: string | null = null
  let fileName: string | null = null
  let fileSize: number | null = null

  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

  if (file && file.size > 0) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Il file supera la dimensione massima consentita (50MB). Dimensione attuale: ${(file.size / 1024 / 1024).toFixed(1)}MB` },
        { status: 400 }
      )
    }

    const ext = file.name.split('.').pop()
    const storagePath = `${taskId}/${user.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await admin.storage
      .from('task-submissions')
      .upload(storagePath, file, { contentType: file.type, upsert: true })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: urlData } = admin.storage.from('task-submissions').getPublicUrl(storagePath)
    fileUrl = urlData.publicUrl
    fileName = file.name
    fileSize = file.size

    // Salva path per rollback in caso di errore DB
    const { data, error } = await admin
      .from('task_submissions')
      .upsert({
        task_id: taskId,
        student_id: user.id,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        notes: notes?.trim() || null,
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'task_id,student_id' })
      .select()
      .single()

    if (error) {
      // Rollback: rimuovi file orfano dallo storage
      await admin.storage.from('task-submissions').remove([storagePath])
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath('/studente/corsi/[id]/task', 'page')
    return NextResponse.json({ submission: data })
  }

  const { data, error } = await admin
    .from('task_submissions')
    .upsert({
      task_id: taskId,
      student_id: user.id,
      file_url: null,
      file_name: null,
      file_size: null,
      notes: notes?.trim() || null,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'task_id,student_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/studente/corsi/[id]/task', 'page')

  return NextResponse.json({ submission: data })
}
