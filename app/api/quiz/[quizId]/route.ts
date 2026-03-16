import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { title, description, passing_score } = await request.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Titolo obbligatorio' }, { status: 400 })

  const { data: quiz } = await supabase.from('course_quizzes').select('id, course_id').eq('id', quizId).single()
  if (!quiz) return NextResponse.json({ error: 'Quiz non trovato' }, { status: 404 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') {
    const { data: isInstructor } = await supabase
      .from('course_instructors').select('instructor_id')
      .eq('course_id', quiz.course_id).eq('instructor_id', user.id).single()
    if (!isInstructor) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { error } = await supabase.from('course_quizzes')
    .update({ title: title.trim(), description: description?.trim() || null, passing_score })
    .eq('id', quizId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: quiz } = await supabase
    .from('course_quizzes')
    .select('id, course_id')
    .eq('id', quizId)
    .single()

  if (!quiz) return NextResponse.json({ error: 'Quiz non trovato' }, { status: 404 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'super_admin') {
    const { data: isInstructor } = await supabase
      .from('course_instructors')
      .select('instructor_id')
      .eq('course_id', quiz.course_id)
      .eq('instructor_id', user.id)
      .single()
    if (!isInstructor) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { error } = await supabase.from('course_quizzes').delete().eq('id', quizId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
