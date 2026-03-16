import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { userId, is_active } = await request.json()
  if (!userId || typeof is_active !== 'boolean') return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
  if (userId === user.id) return NextResponse.json({ error: 'Non puoi modificare te stesso' }, { status: 400 })

  const { error } = await supabase
    .from('profiles')
    .update({ is_active })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, is_active })
}
