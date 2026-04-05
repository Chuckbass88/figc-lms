import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: ev } = await supabase
    .from('course_evaluations')
    .select('evaluator_id')
    .eq('id', id)
    .single()

  if (!ev) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin' && ev.evaluator_id !== user.id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { error } = await supabase.from('course_evaluations').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
