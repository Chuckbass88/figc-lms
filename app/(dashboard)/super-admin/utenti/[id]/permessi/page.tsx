import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PermessiAdminClient from './PermessiAdminClient'

export default async function PermessiAdminPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminProfile } = await supabase
    .from('profiles').select('id, full_name, email, role').eq('id', id).single()

  if (!adminProfile || adminProfile.role !== 'admin') redirect('/super-admin/utenti')

  const { data: perms } = await supabase
    .from('admin_permissions').select('*').eq('admin_user_id', id)

  return <PermessiAdminClient admin={adminProfile} permessi={perms ?? []} />
}
