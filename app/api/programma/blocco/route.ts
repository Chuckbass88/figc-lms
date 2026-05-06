import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { dayId, programId, startTime, endTime, title, description, instructorId, instructorName, isBreak, orderIndex } = await request.json()
  if (!dayId || !programId || !title) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  const { data, error } = await supabase
    .from('program_blocks')
    .insert({
      day_id: dayId,
      program_id: programId,
      start_time: startTime || null,
      end_time: endTime || null,
      title,
      description: description || null,
      instructor_id: instructorId || null,
      instructor_name: instructorName || null,
      is_break: isBreak || false,
      order_index: orderIndex ?? 0,
    })
    .select('*, instructor:profiles!instructor_id(id, full_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { id, startTime, endTime, title, description, instructorId, instructorName, isBreak, orderIndex } = await request.json()
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (startTime !== undefined) updates.start_time = startTime
  if (endTime !== undefined) updates.end_time = endTime
  if (title !== undefined) updates.title = title
  if (description !== undefined) updates.description = description
  if (instructorId !== undefined) updates.instructor_id = instructorId || null
  if (instructorName !== undefined) updates.instructor_name = instructorName || null
  if (isBreak !== undefined) updates.is_break = isBreak
  if (orderIndex !== undefined) updates.order_index = orderIndex

  const { data, error } = await supabase
    .from('program_blocks')
    .update(updates)
    .eq('id', id)
    .select('*, instructor:profiles!instructor_id(id, full_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })

  const { error } = await supabase.from('program_blocks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
