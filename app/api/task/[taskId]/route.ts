import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { title, description, dueDate } = await request.json()
  if (!title) return NextResponse.json({ error: 'Titolo obbligatorio' }, { status: 400 })

  const { data: task } = await supabase
    .from('course_tasks')
    .select('id, course_id')
    .eq('id', taskId)
    .single()

  if (!task) return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') {
    const { data: isInstructor } = await supabase
      .from('course_instructors')
      .select('instructor_id')
      .eq('course_id', task.course_id)
      .eq('instructor_id', user.id)
      .single()
    if (!isInstructor) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { error } = await supabase
    .from('course_tasks')
    .update({ title: title.trim(), description: description?.trim() || null, due_date: dueDate || null })
    .eq('id', taskId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  // Verify the task belongs to a course the user teaches
  const { data: task } = await supabase
    .from('course_tasks')
    .select('id, course_id')
    .eq('id', taskId)
    .single()

  if (!task) return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })

  const { data: profileDel } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profileDel?.role !== 'super_admin') {
    const { data: isInstructor } = await supabase
      .from('course_instructors')
      .select('instructor_id')
      .eq('course_id', task.course_id)
      .eq('instructor_id', user.id)
      .single()
    if (!isInstructor) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { error } = await supabase.from('course_tasks').delete().eq('id', taskId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
