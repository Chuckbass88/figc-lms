import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calcolaDateCorso, toSupabaseDate } from '@/lib/template-utils'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
  }

  const { template_id, corso_id, start_date, skip_sabato } = await req.json()
  if (!template_id || !corso_id || !start_date) {
    return NextResponse.json({ error: 'template_id, corso_id e start_date obbligatori' }, { status: 400 })
  }

  // 1. Fetch template completo
  const { data: template } = await supabase
    .from('course_templates').select('*').eq('id', template_id).single()
  if (!template) return NextResponse.json({ error: 'Template non trovato' }, { status: 404 })

  const { data: allGiorni } = await supabase
    .from('template_giorni').select('*').eq('template_id', template_id).order('numero')
  const giornoIds = (allGiorni ?? []).map(g => g.id)
  const { data: allFasce } = giornoIds.length > 0
    ? await supabase.from('template_fasce_orarie').select('*').in('giorno_id', giornoIds).order('ora_inizio')
    : { data: [] }

  const { data: allModuli } = await supabase
    .from('template_moduli').select('*').eq('template_id', template_id).order('numero')

  const fascePerGiorno = new Map<string, typeof allFasce>()
  ;(allFasce ?? []).forEach((f: Record<string, unknown>) => {
    const list = fascePerGiorno.get(f.giorno_id as string) ?? []
    list.push(f as never)
    fascePerGiorno.set(f.giorno_id as string, list)
  })

  const giorniWithFasce = (allGiorni ?? []).map(g => ({
    ...g,
    fasce: fascePerGiorno.get(g.id) ?? [],
  }))

  // 2. Calcola date reali
  const nGiorni = giorniWithFasce.length
  if (nGiorni === 0) return NextResponse.json({ error: 'Il template non ha giorni' }, { status: 400 })

  const dates = calcolaDateCorso(start_date, nGiorni, { skipSabato: skip_sabato ?? false })

  // 3. Elimina vecchi corso_eventi di questo corso (replace)
  await supabase.from('corso_eventi').delete().eq('corso_id', corso_id)

  // 4. Inserisci nuovi corso_eventi
  const eventiToInsert = giorniWithFasce.flatMap((giorno, idx) => {
    const data = dates[idx]
    if (!data) return []
    return (giorno.fasce ?? []).map((f: Record<string, unknown>) => ({
      corso_id,
      materia: f.materia as string,
      area_id: (f.area_id as string | null) ?? null,
      data: toSupabaseDate(data),
      ora_inizio: f.ora_inizio as string,
      ora_fine: f.ora_fine as string,
      note: (f.note as string | null) ?? null,
    }))
  })

  if (eventiToInsert.length > 0) {
    const { error: evErr } = await supabase.from('corso_eventi').insert(eventiToInsert)
    if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 })
  }

  // 5. Elimina vecchi programmi del corso e ricrea
  const { data: existingPrograms } = await supabase
    .from('course_programs').select('id').eq('course_id', corso_id)
  if (existingPrograms && existingPrograms.length > 0) {
    await supabase.from('course_programs').delete()
      .in('id', existingPrograms.map(p => p.id))
  }

  // 6. Crea nuovo course_program
  const { data: newProgram, error: pErr } = await supabase
    .from('course_programs')
    .insert({
      course_id: corso_id,
      title: template.nome,
      created_by: user.id,
      visibility: 'private',
    })
    .select().single()

  if (pErr || !newProgram) return NextResponse.json({ error: pErr?.message ?? 'Errore programma' }, { status: 500 })

  // 7. Crea program_modules / program_days / program_blocks
  const strutturaTipo = (template.struttura_tipo as string) ?? 'giorni'

  if (strutturaTipo === 'moduli' && allModuli && allModuli.length > 0) {
    const giorniPerModulo = new Map<string, typeof giorniWithFasce>()
    giorniWithFasce.forEach(g => {
      if (g.modulo_id) {
        const list = giorniPerModulo.get(g.modulo_id) ?? []
        list.push(g)
        giorniPerModulo.set(g.modulo_id, list)
      }
    })

    let globalDayIdx = 0
    for (const modulo of allModuli) {
      const { data: pMod, error: mErr } = await supabase
        .from('program_modules')
        .insert({ program_id: newProgram.id, title: modulo.titolo, type: 'module', order_index: modulo.numero - 1 })
        .select().single()
      if (mErr || !pMod) continue

      const giorni = giorniPerModulo.get(modulo.id) ?? []
      for (const giorno of giorni) {
        const data = dates[globalDayIdx++]
        if (!data) continue
        const { data: pDay, error: dErr } = await supabase
          .from('program_days')
          .insert({
            module_id: pMod.id, program_id: newProgram.id,
            title: giorno.titolo ?? `Giorno ${giorno.numero}`,
            day_date: toSupabaseDate(data),
            order_index: giorno.numero - 1,
          })
          .select().single()
        if (dErr || !pDay) continue

        const fasce = giorno.fasce ?? []
        if (fasce.length > 0) {
          await supabase.from('program_blocks').insert(
            fasce.map((f: Record<string, unknown>, i: number) => ({
              day_id: pDay.id, program_id: newProgram.id,
              title: f.materia as string,
              start_time: f.ora_inizio as string,
              end_time: f.ora_fine as string,
              order_index: i,
              is_break: false,
            }))
          )
        }
      }
    }
  } else {
    // struttura 'giorni': un solo modulo generico
    const { data: pMod, error: mErr } = await supabase
      .from('program_modules')
      .insert({ program_id: newProgram.id, title: 'Programma', type: 'block', order_index: 0 })
      .select().single()

    if (!mErr && pMod) {
      for (let i = 0; i < giorniWithFasce.length; i++) {
        const giorno = giorniWithFasce[i]
        const data = dates[i]
        if (!data) continue
        const { data: pDay, error: dErr } = await supabase
          .from('program_days')
          .insert({
            module_id: pMod.id, program_id: newProgram.id,
            title: giorno.titolo ?? `Giorno ${giorno.numero}`,
            day_date: toSupabaseDate(data),
            order_index: i,
          })
          .select().single()
        if (dErr || !pDay) continue

        const fasce = giorno.fasce ?? []
        if (fasce.length > 0) {
          await supabase.from('program_blocks').insert(
            fasce.map((f: Record<string, unknown>, j: number) => ({
              day_id: pDay.id, program_id: newProgram.id,
              title: f.materia as string,
              start_time: f.ora_inizio as string,
              end_time: f.ora_fine as string,
              order_index: j,
              is_break: false,
            }))
          )
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    eventi_creati: eventiToInsert.length,
    program_id: newProgram.id,
  })
}
