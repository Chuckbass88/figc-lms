import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!p || !['super_admin', 'admin'].includes(p.role)) return null
  return user
}

// PUT /api/corso/[id]/eventi/[eventoId] — aggiorna evento
// Body: { materia?, ora_inizio?, ora_fine?, note? }
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; eventoId: string }> }) {
  const { id, eventoId } = await params
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const body = await req.json()
  const patch: Record<string, unknown> = {}
  if (body.materia !== undefined) patch.materia = body.materia
  if (body.ora_inizio !== undefined) patch.ora_inizio = body.ora_inizio
  if (body.ora_fine !== undefined) patch.ora_fine = body.ora_fine
  if (body.note !== undefined) patch.note = body.note ?? null
  if (body.data !== undefined) patch.data = body.data

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })
  }

  const { data: evento, error } = await supabase
    .from('corso_eventi')
    .update(patch)
    .eq('id', eventoId)
    .eq('corso_id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!evento) return NextResponse.json({ error: 'Evento non trovato' }, { status: 404 })
  return NextResponse.json({ evento })
}

// DELETE /api/corso/[id]/eventi/[eventoId]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; eventoId: string }> }) {
  const { id, eventoId } = await params
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { error } = await supabase
    .from('corso_eventi')
    .delete()
    .eq('id', eventoId)
    .eq('corso_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
