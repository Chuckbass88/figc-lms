import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendEmail, emailNuovoAnnuncio } from '@/lib/email'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const contentType = request.headers.get('content-type') ?? ''
  let courseId: string, title: string, content: string
  let file: File | null = null

  if (contentType.includes('multipart/form-data')) {
    const fd = await request.formData()
    courseId = fd.get('courseId') as string
    title    = fd.get('title') as string
    content  = fd.get('content') as string
    file     = (fd.get('file') as File | null) ?? null
    if (file && file.size === 0) file = null
  } else {
    const json = await request.json()
    courseId = json.courseId
    title    = json.title
    content  = json.content
  }

  if (!courseId || !title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }

  // Verifica che l'utente sia docente o admin del corso
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  if (profile.role !== 'super_admin') {
    const { data: isInstructor } = await supabase
      .from('course_instructors')
      .select('instructor_id')
      .eq('course_id', courseId)
      .eq('instructor_id', user.id)
      .single()
    if (!isInstructor) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // Upload allegato opzionale
  let attachmentUrl: string | null = null
  let attachmentName: string | null = null
  let attachmentSize: number | null = null
  let attachmentType: string | null = null

  if (file) {
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `announcements/${courseId}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('course-materials')
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('course-materials').getPublicUrl(path)
    attachmentUrl  = urlData.publicUrl
    attachmentName = file.name
    attachmentSize = file.size
    attachmentType = ext.toUpperCase()
  }

  const { data: annuncio, error } = await supabase
    .from('course_announcements')
    .insert({
      course_id:       courseId,
      author_id:       user.id,
      title:           title.trim(),
      content:         content.trim(),
      attachment_url:  attachmentUrl,
      attachment_name: attachmentName,
      attachment_size: attachmentSize,
      attachment_type: attachmentType,
    })
    .select()
    .single()

  if (error) {
    if (attachmentUrl) {
      const path = attachmentUrl.split('/course-materials/')[1]
      if (path) await supabase.storage.from('course-materials').remove([path])
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notifica a tutti i corsisti attivi
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('student_id')
    .eq('course_id', courseId)
    .eq('status', 'active')

  const studentIds = (enrollments ?? []).map(e => e.student_id)
  if (studentIds.length > 0) {
    const { data: course } = await supabase.from('courses').select('name').eq('id', courseId).single()
    await supabase.from('notifications').insert(
      studentIds.map(id => ({
        user_id: id,
        title: 'Nuovo annuncio nel corso',
        message: `"${title.trim()}" — ${course?.name ?? 'Corso'}`,
        read: false,
      }))
    )

    // Email
    const { data: profiles } = await supabase
      .from('profiles').select('full_name, email').in('id', studentIds)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    for (const p of profiles ?? []) {
      const tmpl = emailNuovoAnnuncio({
        recipientName: p.full_name,
        announcementTitle: title.trim(),
        courseName: course?.name ?? '',
        content: content.trim(),
        appUrl: `${appUrl}/studente/corsi/${courseId}/annunci`,
      })
      await sendEmail({ ...tmpl, to: p.email })
    }
  }

  return NextResponse.json({ ok: true, id: annuncio.id })
}
