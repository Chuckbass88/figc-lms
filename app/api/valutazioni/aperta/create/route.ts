import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { courseId, studentId, voto, commento, tipo } = await request.json()

  if (!courseId || !studentId || voto == null) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }

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

  const { data, error } = await supabase
    .from('course_evaluations')
    .insert({
      course_id: courseId,
      student_id: studentId,
      evaluator_id: user.id,
      voto: Number(voto),
      commento: commento?.trim() || null,
      tipo: tipo ?? 'generale',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('notifications').insert({
    user_id: studentId,
    title: 'Nuova valutazione',
    message: `Voto ${tipo ?? 'generale'}: ${Number(voto).toFixed(1)}/10`,
    read: false,
  })

  return NextResponse.json({ ok: true, id: data.id })
}
