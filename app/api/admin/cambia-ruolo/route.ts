import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const VALID_ROLES = ['studente', 'docente', 'super_admin']

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'super_admin') return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { userId, newRole } = await request.json()
  if (!userId || !newRole || !VALID_ROLES.includes(newRole)) {
    return NextResponse.json({ error: 'Dati non validi' }, { status: 400 })
  }
  if (userId === user.id) {
    return NextResponse.json({ error: 'Non puoi cambiare il tuo ruolo' }, { status: 400 })
  }

  const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
