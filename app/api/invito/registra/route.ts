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

  // Verifica token invito
  const { data: course } = await admin
    .from('courses')
    .select('id, name, status')
    .eq('invite_token', token)
    .single()

  if (!course) {
    return NextResponse.json({ error: 'Link di invito non valido o scaduto' }, { status: 400 })
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

  // Aggiorna profilo (il trigger Supabase lo crea automaticamente alla registrazione)
  const profileUpdate: Record<string, unknown> = {
    full_name: `${nome} ${cognome}`,
    role: 'studente',
    is_active: true,
  }
  if (cellulare?.trim()) profileUpdate.phone = cellulare.trim()

  const { error: profileError } = await admin.from('profiles').update(profileUpdate).eq('id', userId)

  if (profileError) {
    // Rollback: elimina utente auth
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: 'Errore nella creazione del profilo: ' + profileError.message }, { status: 500 })
  }

  // Iscrivi al corso
  const { error: enrollError } = await admin.from('course_enrollments').insert({
    course_id: course.id,
    student_id: userId,
    status: 'active',
    enrolled_at: new Date().toISOString(),
  })

  if (enrollError) {
    return NextResponse.json({ error: 'Errore durante l\'iscrizione al corso' }, { status: 500 })
  }

  return NextResponse.json({ courseId: course.id })
}
