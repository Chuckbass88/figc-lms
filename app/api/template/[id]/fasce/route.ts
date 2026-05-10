import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!p || !['super_admin', 'admin'].includes(p.role)) return null
  return user
}

// POST — aggiunge una fascia
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { giorno_id, ora_inizio, ora_fine, materia, area_id, note } = await req.json()
  if (!giorno_id || !ora_inizio || !ora_fine || !materia) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }
  if (ora_fine <= ora_inizio) {
    return NextResponse.json({ error: 'ora_fine deve essere dopo ora_inizio' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('template_fasce_orarie')
    .insert({ giorno_id, ora_inizio, ora_fine, materia, area_id: area_id ?? null, note: note ?? null })
    .select('*, area:aree(id, nome)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, fascia: data })
}

// PUT — aggiorna una fascia esistente
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { id, ora_inizio, ora_fine, materia, area_id, note } = await req.json()
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })
  if (ora_fine && ora_inizio && ora_fine <= ora_inizio) {
    return NextResponse.json({ error: 'ora_fine deve essere dopo ora_inizio' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (ora_inizio !== undefined) update.ora_inizio = ora_inizio
  if (ora_fine   !== undefined) update.ora_fine   = ora_fine
  if (materia    !== undefined) update.materia    = materia
  if (area_id    !== undefined) update.area_id    = area_id
  if (note       !== undefined) update.note       = note

  const { data, error } = await supabase
    .from('template_fasce_orarie')
    .update(update)
    .eq('id', id)
    .select('*, area:aree(id, nome)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, fascia: data })
}

// DELETE — rimuove una fascia
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { id } = await req.json()
  const { error } = await supabase.from('template_fasce_orarie').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
