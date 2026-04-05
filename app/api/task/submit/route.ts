import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const formData = await request.formData()
  const taskId = formData.get('task_id') as string
  const notes = formData.get('notes') as string
  const file = formData.get('file') as File | null

  if (!taskId) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  let fileUrl: string | null = null
  let fileName: string | null = null
  let fileSize: number | null = null

  if (file && file.size > 0) {
    const ext = file.name.split('.').pop()
    const path = `${taskId}/${user.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await admin.storage
      .from('task-submissions')
      .upload(path, file, { contentType: file.type, upsert: true })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: urlData } = admin.storage.from('task-submissions').getPublicUrl(path)
    fileUrl = urlData.publicUrl
    fileName = file.name
    fileSize = file.size
  }

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/studente/corsi/[id]/task', 'page')

  return NextResponse.json({ submission: data })
}
