import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: annuncio } = await supabase
    .from('course_announcements')
    .select('id, course_id, author_id')
    .eq('id', id)
    .single()

  if (!annuncio) return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  if (profile.role !== 'super_admin') {
    const { data: isInstructor } = await supabase
      .from('course_instructors')
      .select('instructor_id')
      .eq('course_id', annuncio.course_id)
      .eq('instructor_id', user.id)
      .single()
    if (!isInstructor) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // Rimuovi allegato dallo storage se presente
  const { data: existing } = await supabase
    .from('course_announcements')
    .select('attachment_url')
    .eq('id', id)
    .single()

  if (existing?.attachment_url) {
    const path = existing.attachment_url.split('/course-materials/')[1]
    if (path) await supabase.storage.from('course-materials').remove([path])
  }

  const { error } = await supabase.from('course_announcements').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
