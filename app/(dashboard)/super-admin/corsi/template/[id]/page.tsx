import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TemplateEditorClient from './TemplateEditorClient'

export default async function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) redirect('/super-admin')

  const { data: template, error: tErr } = await supabase
    .from('course_templates').select('*').eq('id', id).single()
  if (tErr || !template) notFound()

  const { data: moduli } = await supabase
    .from('template_moduli').select('*').eq('template_id', id).order('numero')

  const { data: allGiorni } = await supabase
    .from('template_giorni').select('*').eq('template_id', id).order('numero')

  const giornoIds = (allGiorni ?? []).map(g => g.id)
  const { data: allFasce } = giornoIds.length > 0
    ? await supabase.from('template_fasce_orarie').select('*, area:aree(id, nome)')
        .in('giorno_id', giornoIds).order('ora_inizio')
    : { data: [] }

  const { data: aree } = await supabase.from('aree').select('id, nome, descrizione, created_at').order('nome')

  // Assembla gerarchia
  const fascePerGiorno = new Map<string, unknown[]>()
  ;(allFasce ?? []).forEach((f: Record<string, unknown>) => {
    const gid = f.giorno_id as string
    const list = fascePerGiorno.get(gid) ?? []
    list.push(f)
    fascePerGiorno.set(gid, list)
  })

  const giorniWithFasce = (allGiorni ?? []).map(g => ({ ...g, fasce: fascePerGiorno.get(g.id) ?? [] }))

  const giorniPerModulo = new Map<string, typeof giorniWithFasce>()
  giorniWithFasce.forEach(g => {
    if (g.modulo_id) {
      const list = giorniPerModulo.get(g.modulo_id) ?? []
      list.push(g)
      giorniPerModulo.set(g.modulo_id, list)
    }
  })

  const moduliWithGiorni = (moduli ?? []).map(m => ({ ...m, giorni: giorniPerModulo.get(m.id) ?? [] }))
  const giorniTop = giorniWithFasce.filter(g => !g.modulo_id)

  const templateCompleto = {
    ...template,
    struttura_tipo: (template.struttura_tipo ?? 'giorni') as 'giorni' | 'moduli',
    materiali_tags: template.materiali_tags ?? [],
    quiz_tags: template.quiz_tags ?? [],
    moduli: moduliWithGiorni,
    giorni: giorniTop,
  }

  return (
    <TemplateEditorClient
      template={templateCompleto as never}
      aree={aree ?? []}
    />
  )
}
