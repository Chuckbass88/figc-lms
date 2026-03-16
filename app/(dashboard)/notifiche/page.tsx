import { createClient } from '@/lib/supabase/server'
import { Bell, CheckCheck } from 'lucide-react'
import NotificheClient from './NotificheClient'

export default async function NotifichePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, title, message, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notifiche</h2>
          <p className="text-gray-500 text-sm mt-1">{notifications?.length ?? 0} notifiche ricevute</p>
        </div>
      </div>
      <NotificheClient initialNotifications={notifications ?? []} userId={user.id} />
    </div>
  )
}
