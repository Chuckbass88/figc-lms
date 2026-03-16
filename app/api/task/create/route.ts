import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { courseId, groupId, title, description, dueDate } = await request.json()
  if (!courseId || !title) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  // Insert task
  const { data: task, error } = await supabase
    .from('course_tasks')
    .insert({
      course_id: courseId,
      group_id: groupId || null,
      title: title.trim(),
      description: description?.trim() || null,
      due_date: dueDate || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch students to notify
  let studentIds: string[] = []

  if (groupId) {
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
  }

  return NextResponse.json({ task })
}
