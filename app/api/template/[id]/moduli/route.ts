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

// POST — aggiunge un nuovo modulo
export async function POST(req: NextRequest, { params }: Params) {
  const { id: template_id } = await params
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { numero, titolo } = await req.json()

  const { data, error } = await supabase
    .from('template_moduli')
    .insert({ template_id, numero, titolo })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, modulo: { ...data, giorni: [] } })
}

// DELETE — rimuove un modulo (cascade su giorni e fasce)
export async function DELETE(req: NextRequest, { params: _ }: Params) {
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { id } = await req.json()
  const { error } = await supabase.from('template_moduli').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// PUT — aggiorna titolo modulo
export async function PUT(req: NextRequest, { params: _ }: Params) {
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { id, titolo } = await req.json()
  const { error } = await supabase.from('template_moduli').update({ titolo }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
