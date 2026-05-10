import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

// GET — fetch template completo con moduli/giorni/fasce
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin', 'docente'].includes(profile.role)) {
    return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
  }

  const { data: template, error } = await supabase
    .from('course_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !template) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // Fetch moduli con giorni+fasce
  const { data: moduli } = await supabase
    .from('template_moduli')
    .select('*')
    .eq('template_id', id)
    .order('numero')

  // Fetch tutti i giorni del template
  const { data: allGiorni } = await supabase
    .from('template_giorni')
    .select('*')
    .eq('template_id', id)
    .order('numero')

  // Fetch tutte le fasce
  const giornoIds = (allGiorni ?? []).map(g => g.id)
  const { data: allFasce } = giornoIds.length > 0
    ? await supabase
        .from('template_fasce_orarie')
        .select('*, area:aree(id, nome)')
        .in('giorno_id', giornoIds)
        .order('ora_inizio')
    : { data: [] }

  // Assembla gerarchia
  const fascePerGiorno = new Map<string, typeof allFasce>()
  ;(allFasce ?? []).forEach(f => {
    const list = fascePerGiorno.get(f!.giorno_id) ?? []
    list.push(f)
    fascePerGiorno.set(f!.giorno_id, list)
  })

  const giorniWithFasce = (allGiorni ?? []).map(g => ({
    ...g,
    fasce: fascePerGiorno.get(g.id) ?? [],
  }))

  // Per struttura_tipo = 'moduli': giorni annidati in moduli
  const giorniPerModulo = new Map<string, typeof giorniWithFasce>()
  giorniWithFasce.forEach(g => {
    if (g.modulo_id) {
      const list = giorniPerModulo.get(g.modulo_id) ?? []
      list.push(g)
      giorniPerModulo.set(g.modulo_id, list)
    }
  })

  const moduliWithGiorni = (moduli ?? []).map(m => ({
    ...m,
    giorni: giorniPerModulo.get(m.id) ?? [],
  }))

  return NextResponse.json({
    ...template,
    moduli: moduliWithGiorni,
    giorni: giorniWithFasce.filter(g => g.modulo_id === null),
  })
}

// PUT — aggiorna campi base del template
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
  }

  const body = await req.json()
  const allowed = ['nome', 'tipologia', 'struttura_tipo', 'materiali_tags', 'quiz_tags', 'parametri']
  const update: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) update[k] = body[k]
  }

  const { data, error } = await supabase
    .from('course_templates')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, template: data })
}
