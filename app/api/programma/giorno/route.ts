import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { moduleId, programId, title, dayDate, sessionId, orderIndex } = await request.json()
  if (!moduleId || !programId) return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

  let resolvedDate = dayDate || null
  let resolvedTitle = title || null
  if (sessionId) {
    const { data: session } = await supabase
      .from('course_sessions')
      .select('title, session_date')
      .eq('id', sessionId)
      .single()
    if (session) {
      resolvedDate = session.session_date
      resolvedTitle = resolvedTitle || session.title
    }
  }

  const { data, error } = await supabase
    .from('program_days')
    .insert({
      module_id: moduleId,
      program_id: programId,
      title: resolvedTitle,
      day_date: resolvedDate,
      linked_session_id: sessionId || null,
      order_index: orderIndex ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { id, title, dayDate, sessionId, orderIndex } = await request.json()
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (title !== undefined) updates.title = title
  if (dayDate !== undefined) updates.day_date = dayDate
  if (sessionId !== undefined) updates.linked_session_id = sessionId ?? null
  if (orderIndex !== undefined) updates.order_index = orderIndex

  const { data, error } = await supabase.from('program_days').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })

  const { error } = await supabase.from('program_days').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
