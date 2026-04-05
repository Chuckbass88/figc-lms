import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { sendEmail, emailNuovoTask } from '@/lib/email'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const formData = await request.formData()
  const courseId = formData.get('courseId') as string
  const groupId = formData.get('groupId') as string || null
  const studentId = formData.get('studentId') as string || null
  const title = formData.get('title') as string
  const description = formData.get('description') as string || null
  const dueDate = formData.get('dueDate') as string || null
  const attachmentType = formData.get('attachmentType') as string | null
  let attachmentUrl: string | null = null
  let attachmentName: string | null = null

  if (!courseId || !title) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  // Gestione allegato
  if (attachmentType === 'link') {
    attachmentUrl = formData.get('attachmentUrl') as string || null
    attachmentName = formData.get('attachmentName') as string || attachmentUrl
  } else if (attachmentType === 'file') {
    const file = formData.get('file') as File | null
    if (file && file.size > 0) {
      const admin = createAdminClient()
      const path = `tasks/${courseId}/${Date.now()}_${file.name}`
      const buffer = Buffer.from(await file.arrayBuffer())
      const { error: uploadErr } = await admin.storage
        .from('task-materials')
        .upload(path, buffer, { contentType: file.type, upsert: false })
      if (!uploadErr) {
        const { data: urlData } = admin.storage.from('task-materials').getPublicUrl(path)
        attachmentUrl = urlData.publicUrl
        attachmentName = file.name
      }
    }
  }

  // Insert task — i campi attachment sono opzionali (le colonne potrebbero non esistere ancora)
  const insertData: Record<string, unknown> = {
    course_id: courseId,
    group_id: groupId || null,
    title: title.trim(),
    description: description?.trim() || null,
    due_date: dueDate || null,
    created_by: user.id,
  }
  if (studentId) insertData.student_id = studentId
  if (attachmentUrl) insertData.attachment_url = attachmentUrl
  if (attachmentName) insertData.attachment_name = attachmentName
  if (attachmentType) insertData.attachment_type = attachmentType

  const { data: task, error } = await supabase
    .from('course_tasks')
    .insert(insertData)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath(`/docente/corsi/${courseId}/task`)
  revalidatePath(`/super-admin/corsi/${courseId}/task`)

  // Fetch students to notify
  let studentIds: string[] = []

  if (studentId) {
    studentIds = [studentId]
  } else if (groupId) {
    const { data: members } = await supabase
      .from('course_group_members')
      .select('student_id')
      .eq('group_id', groupId)
    studentIds = members?.map(m => m.student_id) ?? []
  } else {
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('student_id')
      .eq('course_id', courseId)
      .eq('status', 'active')
    studentIds = enrollments?.map(e => e.student_id) ?? []
  }

  // Send notifications
  if (studentIds.length > 0) {
    const duePart = dueDate
      ? ` Scadenza: ${new Date(dueDate).toLocaleDateString('it-IT')}.`
      : ''
    await supabase.from('notifications').insert(
      studentIds.map(id => ({
        user_id: id,
        title: 'Nuovo task assegnato',
        message: `Ti è stato assegnato un nuovo task: "${title}".${duePart} Accedi alla piattaforma per visualizzarlo.`,
        read: false,
      }))
    )

    // Email
    const { data: course } = await supabase.from('courses').select('name').eq('id', courseId).single()
    const { data: profiles } = await supabase
      .from('profiles').select('id, full_name, email').in('id', studentIds)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    for (const p of profiles ?? []) {
      const tmpl = emailNuovoTask({
        recipientName: p.full_name,
        taskTitle: title,
        courseNme: course?.name ?? '',
        dueDate: dueDate ?? null,
        appUrl: `${appUrl}/studente/corsi/${courseId}/task/${task.id}`,
      })
      await sendEmail({ ...tmpl, to: p.email })
    }
  }

  return NextResponse.json({ task })
}
