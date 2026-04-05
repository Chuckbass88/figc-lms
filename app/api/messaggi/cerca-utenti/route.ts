/**
 * GET /api/messaggi/cerca-utenti?q=...
 * Cerca utenti per nome (min 2 caratteri), esclude il caller.
 * Returns: { users: { id, full_name, role }[] }
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const role = searchParams.get('role')?.trim() ?? ''

  let query = supabase
    .from('profiles')
    .select('id, full_name, role')
    .neq('id', user.id)
    .order('full_name')
    .limit(30)

  if (q.length >= 2) query = query.ilike('full_name', `%${q}%`)
  if (role) query = query.eq('role', role)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ users: data ?? [] })
}
