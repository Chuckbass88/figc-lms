import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!p || !['super_admin', 'admin'].includes(p.role)) return null
  return user
}

// POST — aggiunge un nuovo giorno al template
export async function POST(req: NextRequest, { params }: Params) {
  const { id: template_id } = await params
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { modulo_id, numero, titolo, giorno_settimana, settimana_numero, is_mezza_giornata } = await req.json()

  const { data, error } = await supabase
    .from('template_giorni')
    .insert({
      template_id,
      modulo_id: modulo_id ?? null,
      numero,
      titolo: titolo ?? null,
      giorno_settimana: giorno_settimana ?? null,
      settimana_numero: settimana_numero ?? null,
      is_mezza_giornata: is_mezza_giornata ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, giorno: { ...data, fasce: [] } })
}

// DELETE — rimuove un giorno (cascade su fasce)
export async function DELETE(req: NextRequest, { params: _ }: Params) {
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { id } = await req.json()
  const { error } = await supabase.from('template_giorni').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// PUT — aggiorna titolo giorno (single) o sostituisce tutti i giorni del template (bulk)
export async function PUT(req: NextRequest, { params }: Params) {
  const { id: template_id } = await params
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const body = await req.json()

  if (body.bulk === true) {
    const giorni = body.giorni as Array<{
      numero: number
      titolo?: string
      giorno_settimana?: number
      settimana_numero?: number
      is_mezza_giornata?: boolean
    }>

    if (!Array.isArray(giorni)) {
      return NextResponse.json({ error: 'giorni deve essere un array' }, { status: 400 })
    }

    // Delete all existing giorni for this template (cascades fasce via DB cascade)
    await supabase.from('template_giorni').delete().eq('template_id', template_id)

    if (giorni.length === 0) return NextResponse.json({ success: true, giorni: [] })

    const { data, error } = await supabase
      .from('template_giorni')
      .insert(giorni.map(g => ({
        template_id,
        numero: g.numero,
        titolo: g.titolo ?? null,
        giorno_settimana: g.giorno_settimana ?? null,
        settimana_numero: g.settimana_numero ?? null,
        is_mezza_giornata: g.is_mezza_giornata ?? false,
        modulo_id: null,
      })))
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, giorni: (data ?? []).map(g => ({ ...g, fasce: [] })) })
  }

  // Single update (title edit from GiorniEditor)
  const { id, titolo } = body
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })

  const { data, error } = await supabase
    .from('template_giorni')
    .update({ titolo })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, giorno: data })
}
