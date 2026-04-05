export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import NotificheClient from './NotificheClient'
import NotificaCorsoDocente from '@/app/(dashboard)/docente/notifiche/NotificaCorsoDocente'
import NotificheForm from '@/app/(dashboard)/super-admin/impostazioni/NotificheForm'

export default async function NotifichePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | undefined
  const canInvia = role === 'docente' || role === 'super_admin'

  // Determina tab attivo (solo docente/admin possono vedere "invia")
  const activeTab = canInvia && tab === 'invia' ? 'invia' : 'ricevute'

  // Notifiche ricevute — sempre caricate
  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, title, message, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const unreadCount = (notifications ?? []).filter(n => !n.read).length

  // Dati aggiuntivi per il tab "Invia" (solo se necessario)
  let coursesForDocente: { id: string; name: string; status: string }[] = []
  let usersForAdmin: { id: string; full_name: string; role: string }[] = []

  if (canInvia && activeTab === 'invia') {
    if (role === 'docente') {
      const { data: myCoursesData } = await supabase
        .from('course_instructors')
        .select('course_id, courses(id, name, status)')
        .eq('instructor_id', user.id)
      coursesForDocente =
        (myCoursesData ?? [])
          .map((r: any) => r.courses)
          .filter(Boolean) as { id: string; name: string; status: string }[]
    } else if (role === 'super_admin') {
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('is_active', true)
        .order('full_name')
      usersForAdmin = usersData ?? []
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Notifiche</h2>
        <p className="text-gray-500 text-sm mt-1">
          {activeTab === 'ricevute'
            ? `${notifications?.length ?? 0} ricevute${unreadCount > 0 ? ` · ${unreadCount} non lette` : ''}`
            : role === 'docente'
              ? 'Invia notifiche ai corsisti dei tuoi corsi'
              : 'Invia messaggi personalizzati agli utenti del sistema'}
        </p>
      </div>

      {/* Tab switcher — visibile solo a docente e super_admin */}
      {canInvia && (
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          <Link
            href="/notifiche"
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'ricevute'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Le mie notifiche
            {unreadCount > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-xs font-bold px-1"
                style={{ backgroundColor: '#29ABE2', color: '#1B3768' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <Link
            href="/notifiche?tab=invia"
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'invia'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Invia notifica
          </Link>
        </div>
      )}

      {/* Contenuto del tab attivo */}
      {activeTab === 'ricevute' ? (
        <NotificheClient initialNotifications={notifications ?? []} userId={user.id} />
      ) : role === 'docente' ? (
        <NotificaCorsoDocente courses={coursesForDocente} />
      ) : (
        /* super_admin */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Invia notifica</h3>
            <p className="text-sm text-gray-400 mt-0.5">
              Invia un messaggio a uno o più utenti del sistema
            </p>
          </div>
          <div className="p-6">
            <NotificheForm users={usersForAdmin} />
          </div>
        </div>
      )}
    </div>
  )
}
