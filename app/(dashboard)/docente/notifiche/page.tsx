import { createClient } from '@/lib/supabase/server'
import NotificaCorsoDocente from './NotificaCorsoDocente'

export default async function DocenteNotifiche() {
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Invia Notifica</h2>
        <p className="text-gray-500 text-sm mt-1">Invia un messaggio ai corsisti dei tuoi corsi</p>
      </div>
      <NotificaCorsoDocente courses={courses} />
    </div>
  )
}
