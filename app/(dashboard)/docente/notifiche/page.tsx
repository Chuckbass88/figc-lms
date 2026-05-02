import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import NotificaCorsoDocente from './NotificaCorsoDocente'
import EmailGruppoDocente from './EmailGruppoDocente'

export default async function DocenteNotifiche({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeTab = tab === 'email' ? 'email' : 'notifica'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myCoursesData } = await supabase
    .from('course_instructors')
    .select('course_id, courses(id, name, status)')
    .eq('instructor_id', user.id)

  const courses = myCoursesData
    ?.map(r => r.courses)
    .filter(Boolean) as unknown as { id: string; name: string; status: string }[] ?? []

  const courseIds = courses.map(c => c.id)

  // Fetch groups and students for the email tab (only when needed, but cheap at pilot scale)
  const admin = createAdminClient()

  const [{ data: groupsData }, { data: enrollmentsData }] = await Promise.all([
    courseIds.length > 0
      ? admin.from('course_groups').select('id, name, course_id').in('course_id', courseIds)
      : Promise.resolve({ data: [] }),
    courseIds.length > 0
      ? admin
          .from('course_enrollments')
          .select('student_id, course_id, profiles!student_id(id, full_name, email)')
          .in('course_id', courseIds)
          .eq('status', 'active')
      : Promise.resolve({ data: [] }),
  ])

  const groups = (groupsData ?? []).map(g => ({ id: g.id, name: g.name, courseId: g.course_id }))

  const students = (enrollmentsData ?? [])
    .map((e: any) => {
      const p = e.profiles
      if (!p) return null
      return { id: p.id, full_name: p.full_name ?? '', email: p.email ?? '', courseId: e.course_id }
    })
    .filter(Boolean) as { id: string; full_name: string; email: string; courseId: string }[]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Comunicazioni</h2>
        <p className="text-gray-500 text-sm mt-1">
          {activeTab === 'notifica'
            ? 'Invia notifiche in-app ai corsisti dei tuoi corsi'
            : 'Invia email dirette ai corsisti dei tuoi corsi'}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <a
          href="/docente/notifiche"
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'notifica'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Notifica in-app
        </a>
        <a
          href="/docente/notifiche?tab=email"
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'email'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Email di gruppo
        </a>
      </div>

      {activeTab === 'notifica' ? (
        <NotificaCorsoDocente courses={courses} />
      ) : (
        <EmailGruppoDocente courses={courses} groups={groups} students={students} />
      )}
    </div>
  )
}
