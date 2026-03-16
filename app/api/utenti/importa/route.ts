import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface UserInput {
  full_name: string
  email: string
  password: string
  role: string
}

export async function POST(request: Request) {
  // Verifica che il chiamante sia super_admin
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { users } = await request.json() as { users: UserInput[] }
  if (!Array.isArray(users) || users.length === 0) {
    return NextResponse.json({ error: 'Nessun utente da importare' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Service role key non configurata' }, { status: 500 })

  const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let created = 0
  const failed: { email: string; error: string }[] = []

  for (const u of users) {
    const { email, password, full_name, role } = u
    if (!email || !password || !full_name) {
      failed.push({ email: email ?? '(sconosciuta)', error: 'Campi obbligatori mancanti' })
      continue
    }

    const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (authError) {
      const msg = authError.message.includes('already registered')
        ? 'Email già in uso'
        : authError.message
      failed.push({ email, error: msg })
      continue
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ full_name, role, is_active: true })
      .eq('id', newUser.user.id)

    if (profileError) {
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      failed.push({ email, error: 'Errore nel salvataggio del profilo' })
      continue
    }

    created++
  }

  return NextResponse.json({ created, failed }, { status: 200 })
}
