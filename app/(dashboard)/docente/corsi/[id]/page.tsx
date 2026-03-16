import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, MapPin, Calendar, Users, GraduationCap, Layers, ClipboardList, BookMarked, ChevronRight, ClipboardCheck, Megaphone } from 'lucide-react'
import MaterialiClient from '@/components/materiali/MaterialiClient'

const STATUS_LABELS: Record<string, string> = { active: 'Attivo', completed: 'Completato', draft: 'Bozza' }
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  draft: 'bg-amber-100 text-amber-700',
}

export default async function DocenteCourseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isSuperAdmin = profile?.role === 'super_admin'

  if (!isSuperAdmin) {
    const { data: isInstructor } = await supabase
      .from('course_instructors')
      .select('instructor_id')
      .eq('course_id', id)
      .eq('instructor_id', user.id)
      .single()
    if (!isInstructor) notFound()
  }

  const [
    { data: course },
    { data: enrollments },
    { data: myGroups },
    { data: materials },
    { count: announcementCount },
  ] = await Promise.all([
    supabase.from('courses').select('id, name, description, location, start_date, end_date, status, category').eq('id', id).single(),
    supabase.from('course_enrollments')
      .select('profiles(id, full_name, email), status')
      .eq('course_id', id)
      .eq('status', 'active'),
    supabase.from('course_group_instructors')
      .select(`
        course_groups(
          id, name, description,
          course_group_members(student_id, profiles(id, full_name, email))
        )
      `)
      .eq('instructor_id', user.id),
    supabase.from('course_materials')
      .select('id, name, description, file_url, file_type, file_size, created_at')
      .eq('course_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('course_announcements')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', id),
  ])

  if (!course) notFound()

  const studenti = enrollments?.map(r => r.profiles).filter(Boolean) as unknown as { id: string; full_name: string; email: string }[] ?? []

  const myGroupsInCourse = myGroups
    ?.map(r => r.course_groups)
    .filter(Boolean) as unknown as {
      id: string
      name: string
      description: string | null
      course_group_members: { student_id: string; profiles: { id: string; full_name: string; email: string } | null }[]
    }[]

  // Filtra solo i gruppi che appartengono a questo corso
  const { data: courseGroupIds } = await supabase
    .from('course_groups')
    .select('id')
    .eq('course_id', id)

  const validGroupIds = new Set(courseGroupIds?.map(g => g.id) ?? [])
  const filteredGroups = myGroupsInCourse?.filter(g => validGroupIds.has(g.id)) ?? []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/docente/corsi"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
        >
          <ArrowLeft size={15} /> I miei corsi
        </Link>
        <div className="flex items-start gap-3 mb-1 flex-wrap">
          <h2 className="text-2xl font-bold text-gray-900">{course.name}</h2>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium mt-1 flex-shrink-0 ${STATUS_COLORS[course.status]}`}>
            {STATUS_LABELS[course.status]}
          </span>
          {course.category && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium mt-1 flex-shrink-0 bg-indigo-100 text-indigo-700">
              {course.category}
            </span>
          )}
        </div>
        {course.description && (
          <p className="text-gray-500 text-sm">{course.description}</p>
        )}
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <Link
            href={`/docente/corsi/${id}/presenze`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition"
            style={{ backgroundColor: '#003DA5' }}
          >
            <ClipboardList size={14} /> Registro Presenze
          </Link>
          <Link
            href={`/docente/corsi/${id}/task`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
          >
            <ClipboardCheck size={14} /> Task
          </Link>
          <Link
            href={`/docente/corsi/${id}/quiz`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 transition"
          >
            <ClipboardCheck size={14} /> Quiz
          </Link>
          <Link
            href={`/docente/corsi/${id}/annunci`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
          >
            <Megaphone size={14} /> Annunci
            {(announcementCount ?? 0) > 0 && (
              <span className="ml-0.5 text-xs bg-indigo-200 text-indigo-800 px-1.5 py-0 rounded-full font-semibold">
                {announcementCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Info */}
      {(course.location || course.start_date) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex flex-wrap gap-5 text-sm text-gray-600">
            {course.location && (
              <span className="flex items-center gap-2">
                <MapPin size={14} className="text-gray-400" /> {course.location}
              </span>
            )}
            {course.start_date && (
              <span className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-400" />
                {new Date(course.start_date).toLocaleDateString('it-IT')}
                {course.end_date && ` → ${new Date(course.end_date).toLocaleDateString('it-IT')}`}
              </span>
            )}
            <span className="flex items-center gap-2">
              <Users size={14} className="text-gray-400" /> {studenti.length} corsisti iscritti
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* I miei gruppi */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Layers size={15} className="text-indigo-600" />
            <h3 className="font-semibold text-gray-900 text-sm">I miei gruppi</h3>
            <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
              {filteredGroups.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {filteredGroups.map(g => (
              <div key={g.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900">{g.name}</p>
                  <span className="text-xs text-gray-400">{g.course_group_members.length} corsisti</span>
                </div>
                {g.description && <p className="text-xs text-gray-400 mb-2">{g.description}</p>}
                <div className="space-y-1.5">
                  {g.course_group_members.map(m => (
                    <Link key={m.student_id} href={`/docente/corsisti/${m.student_id}`} className="flex items-center gap-2 p-1.5 rounded-lg bg-green-50 hover:bg-green-100 transition group">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {m.profiles?.full_name.charAt(0) ?? '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 group-hover:text-blue-700 transition truncate">{m.profiles?.full_name}</p>
                      </div>
                    </Link>
                  ))}
                  {g.course_group_members.length === 0 && (
                    <p className="text-xs text-gray-400">Nessun corsista in questo gruppo.</p>
                  )}
                </div>
              </div>
            ))}
            {filteredGroups.length === 0 && (
              <p className="px-5 py-4 text-sm text-gray-400">Non sei assegnato a nessun gruppo per questo corso.</p>
            )}
          </div>
        </div>

        {/* Tutti i corsisti */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <GraduationCap size={15} className="text-green-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Corsisti iscritti</h3>
            <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              {studenti.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {studenti.map(s => (
              <Link
                key={s.id}
                href={`/docente/corsisti/${s.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition group"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {s.full_name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{s.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{s.email}</p>
                </div>
                <ChevronRight size={13} className="text-gray-300 group-hover:text-blue-400 transition flex-shrink-0" />
              </Link>
            ))}
            {studenti.length === 0 && (
              <p className="px-5 py-4 text-sm text-gray-400">Nessun corsista iscritto.</p>
            )}
          </div>
        </div>
      </div>

      {/* Materiali */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <BookMarked size={15} className="text-amber-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Materiali del corso</h3>
        </div>
        <MaterialiClient courseId={id} initialMaterials={materials ?? []} canUpload={true} />
      </div>
    </div>
  )
}
