import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { token, nome, cognome, email, password, cellulare } = await request.json()

  if (!token || !nome || !cognome || !email || !password) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'La password deve essere di almeno 8 caratteri' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verifica token invito docente
  const { data: inviteToken } = await admin
    .from('invite_tokens')
    .select('id, role, used_at, expires_at')
    .eq('token', token)
    .eq('role', 'docente')
    .single()

  if (!inviteToken) {
    return NextResponse.json({ error: 'Link di invito non valido o scaduto' }, { status: 400 })
  }
  if (inviteToken.used_at) {
    return NextResponse.json({ error: 'Questo link di invito è già stato utilizzato' }, { status: 400 })
  }
  if (inviteToken.expires_at && new Date(inviteToken.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Questo link di invito è scaduto' }, { status: 400 })
  }

  // Crea utente Supabase Auth
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `${nome} ${cognome}` },
  })

  if (authError) {
    const msg = authError.message.includes('already registered')
      ? 'Esiste già un account con questa email. Accedi dalla pagina di login.'
      : authError.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const userId = authData.user.id

  // Aggiorna profilo con ruolo docente
  const profileUpdate: Record<string, unknown> = {
    full_name: `${nome} ${cognome}`,
    role: 'docente',
    is_active: true,
  }
  if (cellulare?.trim()) profileUpdate.phone = cellulare.trim()

  const { error: profileError } = await admin
    .from('profiles')
    .update(profileUpdate)
    .eq('id', userId)

  if (profileError) {
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: 'Errore nella creazione del profilo: ' + profileError.message }, { status: 500 })
  }

  // Segna token come usato
  await admin
    .from('invite_tokens')
    .update({ used_at: new Date().toISOString(), used_by: userId })
    .eq('id', inviteToken.id)

  return NextResponse.json({ success: true })
}
