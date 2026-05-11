import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: templates } = await supabase.from('course_templates').select('*').order('nome')
  return NextResponse.json({ templates: templates ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: callerProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!callerProfile || !['super_admin', 'admin'].includes(callerProfile.role)) {
    return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
  }

  const body = await req.json()
  const { nome, tipologia, struttura_tipo, materiali_tags, quiz_tags, parametri } = body
  const { data, error } = await supabase
    .from('course_templates')
    .insert({
      nome,
      tipologia: tipologia ?? null,
      struttura_tipo: struttura_tipo ?? 'giorni',
      materiali_tags: materiali_tags ?? [],
      quiz_tags: quiz_tags ?? [],
      parametri: parametri ?? {},
      created_by: user.id,
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, template: data })
}
