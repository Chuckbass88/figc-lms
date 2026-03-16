import { createClient } from '@/lib/supabase/server'
import NotificheForm from './NotificheForm'

export default async function Impostazioni() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('is_active', true)
    .order('full_name')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Invia Notifiche</h2>
        <p className="text-gray-500 text-sm mt-1">Invia messaggi personalizzati agli utenti del sistema</p>
      </div>

      {/* Invio notifiche */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Invia notifica</h3>
          <p className="text-sm text-gray-400 mt-0.5">Invia un messaggio a uno o più utenti del sistema</p>
        </div>
        <div className="p-6">
          <NotificheForm users={users ?? []} />
        </div>
      </div>

    </div>
  )
}
