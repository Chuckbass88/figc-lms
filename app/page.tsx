import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'

const ROLE_ROUTES: Record<UserRole, string> = {
  super_admin: '/super-admin',
  docente: '/docente',
  studente: '/studente',
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  redirect(ROLE_ROUTES[profile.role as UserRole])
}
