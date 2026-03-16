import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Verifica che il chiamante sia super_admin
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { full_name, email, password, role } = await request.json()
  if (!full_name || !email || !password || !role) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Service role key non configurata' }, { status: 500 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Crea utente in auth
  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    const msg = authError.message.includes('already registered')
      ? 'Email già in uso'
      : authError.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Aggiorna profilo con nome e ruolo
  const { error: profileError } = await admin
    .from('profiles')
    .update({ full_name, role })
    .eq('id', newUser.user.id)

  if (profileError) {
    // Rollback: elimina l'utente appena creato
    await admin.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: 'Errore nel salvataggio del profilo' }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId: newUser.user.id })
}
