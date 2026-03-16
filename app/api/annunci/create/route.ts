import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { courseId, title, content } = await request.json()
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

  const { data: annuncio, error } = await supabase
    .from('course_announcements')
    .insert({ course_id: courseId, author_id: user.id, title: title.trim(), content: content.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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
  }

  return NextResponse.json({ ok: true, id: annuncio.id })
}
