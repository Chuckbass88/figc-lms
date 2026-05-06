import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/note-personali/[id]
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await request.json()
  const allowed = ['title', 'content', 'linked_course_id', 'linked_module_id', 'linked_day_id', 'linked_block_id']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }
  // Supporta camelCase
  if ('linkedCourseId' in body) updates.linked_course_id = body.linkedCourseId
  if ('linkedModuleId' in body) updates.linked_module_id = body.linkedModuleId
  if ('linkedDayId' in body) updates.linked_day_id = body.linkedDayId
  if ('linkedBlockId' in body) updates.linked_block_id = body.linkedBlockId

  const { data, error } = await supabase.from('notes').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/note-personali/[id]
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
