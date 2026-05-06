import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

// GET /api/programma/[id] — programma completo con gerarchia
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: program, error } = await supabase
    .from('course_programs')
    .select(`
      *,
      creator:profiles!created_by(id, full_name),
      modules:program_modules(
        *,
        days:program_days(
          *,
          blocks:program_blocks(*, instructor:profiles!instructor_id(id, full_name))
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!program) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // Ordina per order_index
  program.modules?.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)
  program.modules?.forEach((m: { days?: { order_index: number; blocks?: { order_index: number }[] }[] }) => {
    m.days?.sort((a, b) => a.order_index - b.order_index)
    m.days?.forEach(d => d.blocks?.sort((a, b) => a.order_index - b.order_index))
  })

  return NextResponse.json(program)
}

// PATCH /api/programma/[id] — aggiorna metadati (titolo, visibility)
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await request.json()
  const allowed = ['title', 'visibility']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('course_programs')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/programma/[id]
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { error } = await supabase.from('course_programs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
