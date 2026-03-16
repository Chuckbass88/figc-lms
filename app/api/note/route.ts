import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { courseId, studentId, content } = await request.json()
  if (!courseId || !studentId) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  // Verifica che il docente insegni in questo corso
  const { data: isInstructor } = await supabase
    .from('course_instructors')
    .select('instructor_id')
    .eq('course_id', courseId)
    .eq('instructor_id', user.id)
    .single()

  if (!isInstructor) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  if (!content?.trim()) {
    // Elimina la nota se il contenuto è vuoto
    await supabase
      .from('student_notes')
      .delete()
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .eq('instructor_id', user.id)
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabase
    .from('student_notes')
    .upsert(
      { course_id: courseId, student_id: studentId, instructor_id: user.id, content: content.trim(), updated_at: new Date().toISOString() },
      { onConflict: 'course_id,student_id,instructor_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
