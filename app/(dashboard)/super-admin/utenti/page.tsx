import { createClient } from '@/lib/supabase/server'
import UtentiClient from './UtentiClient'

export default async function SuperAdminUtenti() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active, created_at')
    .order('role')
    .order('full_name')

  return (
    <UtentiClient
      initialUsers={users ?? []}
      currentUserId={user?.id ?? ''}
    />
  )
}
