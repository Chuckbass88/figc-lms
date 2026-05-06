import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, MapPin, Calendar, Users, UserCheck, Layers, Pencil, GraduationCap, ClipboardList, BookMarked, CalendarDays, CalendarCheck, Megaphone, TrendingUp, ClipboardCheck, CalendarRange } from 'lucide-react'
import MaterialiClient from '@/components/materiali/MaterialiClient'
import ArchivioCorsoSection from '@/components/archivio/ArchivioCorsoSection'
import NotificaCorso from './NotificaCorso'
import CambiaStatoBtn from './CambiaStatoBtn'
import LinkInvitoBtn from './LinkInvitoBtn'
import EsportaIdoneitaCSV, { type StudentIdoneitaRow } from './EsportaIdoneitaCSV'

const STATUS_LABELS: Record<string, string> = { active: 'Attivo', completed: 'Completato', draft: 'Bozza' }
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  draft: 'bg-amber-100 text-amber-700',
}

export default async function CourseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: course },
    { data: instructors },
    { data: enrollments },
    { data: groups },
    { data: materials },
    { count: sessionCount },
    { data: announcements },
  ] = await Promise.all([
    supabase.from('courses').select('*').eq('id', id).single(),
    supabase.from('course_instructors')
      .select('profiles(id, full_name, email)')
      .eq('course_id', id),
    supabase.from('course_enrollments')
      .select('profiles(id, full_name, email), status')
      .eq('course_id', id)
      .eq('status', 'active'),
    supabase.from('course_groups')
      .select(`
        id, name, description,
        course_group_members(student_id, profiles(full_name)),
        course_group_instructors(instructor_id, profiles(full_name))
      `)
      .eq('course_id', id)
      .order('created_at'),
    supabase.from('course_materials')
      .select('id, name, description, file_url, file_type, file_size, created_at')
      .eq('course_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('course_sessions').select('*', { count: 'exact', head: true }).eq('course_id', id),
    supabase.from('course_announcements').select('id, title, created_at, profiles(full_name)').eq('course_id', id).order('created_at', { ascending: false }),
  ])

  if (!course) notFound()

  const docenti = instructors?.map(r => r.profiles).filter(Boolean) as unknown as { id: string; full_name: string; email: string }[] ?? []
  const studenti = enrollments?.map(r => r.profiles).filter(Boolean) as unknown as { id: string; full_name: string; email: string }[] ?? []

  // Idoneità: presenze + quiz per tutti i corsisti
  const studentIds = studenti.map(s => s.id)

  const { data: sessions } = await supabase
    .from('course_sessions').select('id').eq('course_id', id)
  const sessionIds = sessions?.map(s => s.id) ?? []

  const { data: allAttendances } = sessionIds.length > 0 && studentIds.length > 0
    ? await supabase
        .from('attendances')
        .select('session_id, student_id, present')
        .in('session_id', sessionIds)
        .in('student_id', studentIds)
    : { data: [] }

  const { data: courseQuizzes } = await supabase
    .from('course_quizzes').select('id').eq('course_id', id)
  const quizIds = courseQuizzes?.map(q => q.id) ?? []

  const { data: allAttempts } = quizIds.length > 0 && studentIds.length > 0
    ? await supabase
        .from('quiz_attempts')
        .select('quiz_id, student_id, passed')
        .in('quiz_id', quizIds)
        .in('student_id', studentIds)
    : { data: [] }

  const totalSessions = sessionIds.length
  const totalQuizzes = quizIds.length

  const idoneitaRows: StudentIdoneitaRow[] = studenti.map(s => {
    const attStudente = (allAttendances ?? []).filter(a => a.student_id === s.id)
    const presenti = attStudente.filter(a => a.present).length
    const presenzePct = totalSessions > 0 ? Math.round((presenti / totalSessions) * 100) : null
    const idoneoPresenze = presenzePct !== null ? presenzePct >= 75 : null

    const attemptsStudente = (allAttempts ?? []).filter(a => a.student_id === s.id)
    const quizCompletati = attemptsStudente.length
    const quizSuperati = attemptsStudente.filter(a => a.passed).length

    return {
      full_name: s.full_name,
      email: s.email,
      presenzePct,
      idoneoPresenze,
      quizCompletati,
      quizSuperati,
      totalQuizzes,
    }
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/super-admin/corsi"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
        >
          <ArrowLeft size={15} /> Torna ai corsi
        </Link>
        <div className="flex flex-col gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h2 className="text-2xl font-bold text-gray-900">{course.name}</h2>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[course.status]}`}>
                {STATUS_LABELS[course.status]}
              </span>
              {course.category && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-indigo-100 text-indigo-700">
                  {course.category}
                </span>
              )}
            </div>
            {course.description && (
              <p className="text-gray-500 text-sm">{course.description}</p>
            )}
            <div className="mt-3">
              <CambiaStatoBtn courseId={id} currentStatus={course.status} />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <LinkInvitoBtn courseId={id} courseName={course.name} inviteToken={course.invite_token ?? null} />
            <NotificaCorso courseId={id} courseName={course.name} />
            <Link
              href={`/super-admin/corsi/${id}/sessioni`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
            >
              <CalendarDays size={14} /> Sessioni
            </Link>
            <Link
              href={`/super-admin/corsi/${id}/programma`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 border border-blue-200 transition"
            >
              <CalendarRange size={14} /> Programma
            </Link>
            <Link
              href={`/docente/corsi/${id}/quiz`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
            >
              <ClipboardCheck size={14} /> Quiz
            </Link>
            <Link
              href={`/docente/corsi/${id}/task`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
            >
              <ClipboardList size={14} /> Task
            </Link>
            <Link
              href={`/docente/corsi/${id}/annunci`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
            >
              <Megaphone size={14} /> Annunci
            </Link>
            <Link
              href={`/super-admin/corsi/${id}/modifica`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
            >
              <Pencil size={14} /> Modifica
            </Link>
            <Link
              href={`/super-admin/corsi/${id}/presenze`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
            >
              <ClipboardList size={14} /> Presenze
            </Link>
            <Link
              href={`/super-admin/corsi/${id}/gestione`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition hover:opacity-90"
              style={{ backgroundColor: '#1565C0' }}
            >
              <Users size={14} /> Partecipanti
            </Link>
          </div>
        </div>
      </div>

      {/* Info + Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Info */}
        <div className="sm:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Informazioni</p>
          <div className="space-y-2 text-sm text-gray-700">
            {course.location && (
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                <span>{course.location}</span>
              </div>
            )}
            {course.start_date && (
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                <span>
                  {new Date(course.start_date).toLocaleDateString('it-IT')}
                  {course.end_date && ` → ${new Date(course.end_date).toLocaleDateString('it-IT')}`}
                </span>
              </div>
            )}
            {course.category && (
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-gray-400 flex-shrink-0" />
                <span>{course.category}</span>
              </div>
            )}
            {!course.location && !course.start_date && !course.category && (
              <p className="text-gray-400 text-sm">Nessuna informazione aggiuntiva.</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Statistiche</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <UserCheck size={14} className="text-blue-500" /> Docenti
              </span>
              <span className="text-sm font-bold text-gray-900">{docenti.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <GraduationCap size={14} className="text-green-500" /> Corsisti
              </span>
              <span className="text-sm font-bold text-gray-900">{studenti.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <Layers size={14} className="text-indigo-500" /> Gruppi
              </span>
              <span className="text-sm font-bold text-gray-900">{groups?.length ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <CalendarCheck size={14} className="text-amber-500" /> Sessioni
              </span>
              <Link href={`/super-admin/corsi/${id}/sessioni`} className="text-sm font-bold text-gray-900 hover:text-blue-600 transition">
                {sessionCount ?? 0}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Docenti */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <UserCheck size={15} className="text-blue-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Docenti</h3>
            <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {docenti.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {(docenti as { id: string; full_name: string; email: string }[]).map(d => (
              <Link key={d.id} href={`/super-admin/utenti/${d.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition group">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#1565C0' }}>
                  {d.full_name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{d.full_name}</p>
<p className="text-xs text-gray-400 truncate">{d.email}</p>
                </div>
              </Link>
            ))}
            {docenti.length === 0 && (
              <p className="px-5 py-4 text-sm text-gray-400">Nessun docente assegnato.</p>
            )}
          </div>
        </div>

        {/* Corsisti */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <GraduationCap size={15} className="text-green-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Corsisti</h3>
            <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              {studenti.length}
            </span>
            {studenti.length > 0 && (
              <EsportaIdoneitaCSV courseName={course.name} students={idoneitaRows} />
            )}
          </div>
          <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
            {(studenti as { id: string; full_name: string; email: string }[]).map((s, idx) => {
              const row = idoneitaRows[idx]
              return (
                <Link key={s.id} href={`/super-admin/utenti/${s.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition group">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-emerald-500">
                    {s.full_name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{s.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">{s.email}</p>
                  </div>
                  {row?.presenzePct !== null && row?.presenzePct !== undefined && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <TrendingUp size={12} className={row.presenzePct >= 75 ? 'text-green-600' : row.presenzePct >= 50 ? 'text-amber-500' : 'text-red-500'} />
                      <span className={`text-xs font-bold ${row.presenzePct >= 75 ? 'text-green-700' : row.presenzePct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        {row.presenzePct}%
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${row.idoneoPresenze ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {row.idoneoPresenze ? 'Idoneo' : 'A rischio'}
                      </span>
                    </div>
                  )}
                </Link>
              )
            })}
            {studenti.length === 0 && (
              <p className="px-5 py-4 text-sm text-gray-400">Nessun corsista iscritto.</p>
            )}
          </div>
        </div>
      </div>

      {/* Annunci */}
      {(announcements ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Megaphone size={15} className="text-indigo-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Annunci del corso</h3>
            <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
              {announcements!.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {(announcements as unknown as { id: string; title: string; created_at: string; profiles: { full_name: string } | null }[]).slice(0, 3).map(a => (
              <div key={a.id} className="px-5 py-3">
                <p className="text-sm font-medium text-gray-900">{a.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(a.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {a.profiles && ` · ${a.profiles.full_name}`}
                </p>
              </div>
            ))}
          </div>
          {announcements!.length > 3 && (
            <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
              +{announcements!.length - 3} altri annunci
            </div>
          )}
        </div>
      )}

      {/* Materiali */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <BookMarked size={15} className="text-amber-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Materiali del corso</h3>
        </div>
        <MaterialiClient courseId={id} initialMaterials={materials ?? []} canUpload={true} />
      </div>

      {/* Archivio Documenti del corso */}
      <ArchivioCorsoSection courseId={id} />

      {/* Gruppi */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Layers size={15} className="text-indigo-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Microgruppi</h3>
          <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
            {groups?.length ?? 0}
          </span>
          <Link
            href={`/super-admin/corsi/${id}/gruppi`}
            className="text-xs text-indigo-600 hover:underline ml-2"
          >
            Gestisci →
          </Link>
        </div>
        {groups && groups.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {groups.map(g => (
              <div key={g.id} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-semibold text-gray-900">{g.name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{g.course_group_instructors.length} doc.</span>
                    <span>{g.course_group_members.length} cors.</span>
                  </div>
                </div>
                {g.description && <p className="text-xs text-gray-400">{g.description}</p>}
                {g.course_group_instructors.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {g.course_group_instructors.map((i: { instructor_id: string; profiles: unknown }) => (
                      <span key={i.instructor_id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {(i.profiles as { full_name: string } | null)?.full_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="px-5 py-4 text-sm text-gray-400">Nessun gruppo creato. <Link href={`/super-admin/corsi/${id}/gruppi`} className="text-indigo-600 hover:underline">Crea il primo gruppo →</Link></p>
        )}
      </div>
    </div>
  )
}
