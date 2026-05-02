export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import NotificheClient from './NotificheClient'
import NotificaCorsoDocente from '@/app/(dashboard)/docente/notifiche/NotificaCorsoDocente'
import EmailGruppoDocente from '@/app/(dashboard)/docente/notifiche/EmailGruppoDocente'
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as string | undefined
  const canInvia = role === 'docente' || role === 'super_admin'

  const activeTab = canInvia && (tab === 'invia' || tab === 'email') ? tab : 'ricevute'

  // Notifiche ricevute
  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, title, message, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const unreadCount = (notifications ?? []).filter(n => !n.read).length

  // Dati per i tab di invio
  let coursesForDocente: { id: string; name: string; status: string }[] = []
  let usersForAdmin: { id: string; full_name: string; role: string }[] = []
  let groupsForEmail: { id: string; name: string; courseId: string }[] = []
  let studentsForEmail: { id: string; full_name: string; email: string; courseId: string }[] = []
  let allCourses: { id: string; name: string; status: string }[] = []

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

  if (canInvia && activeTab === 'email') {
    const admin = createAdminClient()

    if (role === 'docente') {
      const { data: myCoursesData } = await supabase
        .from('course_instructors')
        .select('course_id, courses(id, name, status)')
        .eq('instructor_id', user.id)
      allCourses = (myCoursesData ?? []).map((r: any) => r.courses).filter(Boolean) as { id: string; name: string; status: string }[]
    } else {
      const { data: coursesData } = await admin.from('courses').select('id, name, status').order('name')
      allCourses = coursesData ?? []
    }

    const courseIds = allCourses.map(c => c.id)

    if (courseIds.length > 0) {
      const [{ data: groupsData }, { data: enrollmentsData }] = await Promise.all([
        admin.from('course_groups').select('id, name, course_id').in('course_id', courseIds),
        admin
          .from('course_enrollments')
          .select('student_id, course_id, profiles!student_id(id, full_name, email)')
          .in('course_id', courseIds)
          .eq('status', 'active'),
      ])

      groupsForEmail = (groupsData ?? []).map(g => ({ id: g.id, name: g.name, courseId: g.course_id }))
      studentsForEmail = (enrollmentsData ?? [])
        .map((e: any) => {
          const p = e.profiles
          if (!p) return null
          return { id: p.id, full_name: p.full_name ?? '', email: p.email ?? '', courseId: e.course_id }
        })
        .filter(Boolean) as { id: string; full_name: string; email: string; courseId: string }[]
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
            : activeTab === 'email'
              ? 'Invia email dirette ai corsisti per corso, microgruppo o singolo'
              : role === 'docente'
                ? 'Invia notifiche ai corsisti dei tuoi corsi'
                : 'Invia messaggi personalizzati agli utenti del sistema'}
        </p>
      </div>

      {/* Tab switcher */}
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
            Notifica in-app
          </Link>
          <Link
            href="/notifiche?tab=email"
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'email'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Email di gruppo
          </Link>
        </div>
      )}

      {/* Contenuto */}
      {activeTab === 'ricevute' ? (
        <NotificheClient initialNotifications={notifications ?? []} userId={user.id} />
      ) : activeTab === 'email' ? (
        <EmailGruppoDocente courses={allCourses} groups={groupsForEmail} students={studentsForEmail} />
      ) : role === 'docente' ? (
        <NotificaCorsoDocente courses={coursesForDocente} />
      ) : (
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
