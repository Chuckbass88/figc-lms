export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  ArrowLeft, MapPin, Calendar, UserCheck, BookMarked,
  ClipboardList, Clock, CheckCircle, Megaphone, CalendarCheck,
  AlertCircle, Users, Award, GraduationCap, FileText, Download,
  File, FileImage, FileSpreadsheet,
} from 'lucide-react'
import MiniCalendario from '@/components/calendario/MiniCalendario'

const STATUS_LABELS: Record<string, string> = { active: 'In Corso', completed: 'Completato', draft: 'Bozza' }
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  draft: 'bg-amber-100 text-amber-700',
}

function FileIcon({ type }: { type: string | null }) {
  const t = type?.toLowerCase()
  if (t === 'pdf') return <FileText size={16} className="text-red-500 flex-shrink-0" />
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(t ?? '')) return <FileImage size={16} className="text-blue-500 flex-shrink-0" />
  if (['xlsx', 'xls', 'csv'].includes(t ?? '')) return <FileSpreadsheet size={16} className="text-green-600 flex-shrink-0" />
  return <File size={16} className="text-gray-400 flex-shrink-0" />
}

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default async function StudenteCourseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: enrollment } = await supabase
    .from('course_enrollments')
    .select('status, enrolled_at')
    .eq('course_id', id)
    .eq('student_id', user.id)
    .single()

  if (!enrollment) notFound()

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: course },
    { data: instructors },
    { data: myGroupRow },
    { data: materials },
    { count: announcementCount },
    { data: allSessions },
    { data: courseTasks },
    { count: quizCount },
  ] = await Promise.all([
    supabase.from('courses')
      .select('id, name, description, location, start_date, end_date, status, category')
      .eq('id', id).single(),
    supabase.from('course_instructors').select('profiles(id, full_name)').eq('course_id', id),
    supabase.from('course_groups')
      .select(`id, name, description,
        course_group_instructors(instructor_id, profiles(full_name)),
        course_group_members!inner(student_id)`)
      .eq('course_id', id)
      .eq('course_group_members.student_id', user.id)
      .maybeSingle(),
    supabase.from('course_materials')
      .select('id, name, description, file_url, file_type, file_size, created_at, target_type, target_id')
      .eq('course_id', id).order('created_at', { ascending: false }),
    supabase.from('course_announcements')
      .select('*', { count: 'exact', head: true }).eq('course_id', id),
    supabase.from('course_sessions')
      .select('id, title, session_date, attendances(student_id, present)')
      .eq('course_id', id)
      .order('session_date', { ascending: true }),
    supabase.from('course_tasks')
      .select('id, title, due_date, student_id, group_id')
      .eq('course_id', id),
    supabase.from('course_quizzes')
      .select('*', { count: 'exact', head: true }).eq('course_id', id),
  ])

  if (!course) notFound()

  // Fetch ore_totali separately — the column may not exist yet (migration 030)
  const { data: oreRow } = await supabase
    .from('courses').select('ore_totali').eq('id', id).single()

  // ── Materiali visibili ───────────────────────────────────────────────────────
  const myGroupId = myGroupRow?.id ?? null
  const visibleMaterials = (materials ?? []).filter(m => {
    const tt = (m as { target_type?: string | null }).target_type ?? 'all'
    const ti = (m as { target_id?: string | null }).target_id ?? null
    if (tt === 'all') return true
    if (tt === 'group') return ti === myGroupId
    if (tt === 'student') return ti === user.id
    return true
  })

  // ── Task: pendenti ───────────────────────────────────────────────────────────
  type TaskRow = { id: string; title: string; due_date: string | null; student_id: string | null; group_id: string | null }
  const taskList = (courseTasks ?? []) as unknown as TaskRow[]

  const { data: myGroupMembership } = myGroupId
    ? await supabase.from('course_group_members').select('group_id').eq('student_id', user.id)
    : { data: [] }
  const myGroupIds = new Set((myGroupMembership ?? []).map(m => m.group_id))

  const myTaskIds = taskList
    .filter(t => (!t.student_id && !t.group_id) || t.student_id === user.id || (t.group_id && myGroupIds.has(t.group_id)))
    .map(t => t.id)

  const { data: mySubmissions } = myTaskIds.length > 0
    ? await supabase.from('task_submissions').select('task_id, status').eq('student_id', user.id).in('task_id', myTaskIds)
    : { data: [] }

  const submittedSet = new Set((mySubmissions ?? []).map(s => s.task_id))
  const myVisibleTasks = taskList.filter(t =>
    (!t.student_id && !t.group_id) || t.student_id === user.id || (t.group_id && myGroupIds.has(t.group_id))
  )
  const pendingTasks = myVisibleTasks.filter(t => !submittedSet.has(t.id))
  const overdueTasks = pendingTasks.filter(t => t.due_date && t.due_date < today)

  // ── Presenze ─────────────────────────────────────────────────────────────────
  const sessionList = allSessions ?? []
  const sessionDates = sessionList.map(s => s.session_date as string)
  const pastSessions = sessionList.filter(s => s.session_date <= today)
  const presentCount = pastSessions.filter(s =>
    s.attendances.some((a: { student_id: string; present: boolean }) => a.student_id === user.id && a.present)
  ).length
  const absentCount = pastSessions.filter(s =>
    s.attendances.some((a: { student_id: string; present: boolean }) => a.student_id === user.id && !a.present)
  ).length
  const totalPast = pastSessions.length
  const oreTotali = (oreRow as unknown as { ore_totali?: number | null } | null)?.ore_totali ?? null

  const orePerSessione = oreTotali && sessionList.length > 0 ? oreTotali / sessionList.length : null
  const oreAssenza = orePerSessione ? Math.round(absentCount * orePerSessione * 10) / 10 : null
  const oreMassime = oreTotali ? Math.round(oreTotali * 0.10 * 10) / 10 : null
  const pctAssenza = totalPast > 0 ? Math.round((absentCount / totalPast) * 100) : 0
  const isSogliaSuperata = oreAssenza !== null && oreMassime !== null
    ? oreAssenza > oreMassime
    : pctAssenza > 10

  const nextSession = sessionList.find(s => s.session_date > today)

  const docenti = (instructors ?? []).map(r => r.profiles).filter(Boolean) as unknown as { id: string; full_name: string }[]

  const myGroup = myGroupRow as {
    id: string; name: string; description: string | null
    course_group_instructors: { instructor_id: string; profiles: { full_name: string } | null }[]
    course_group_members: { student_id: string }[]
  } | null

  const { data: groupmates } = myGroup
    ? await supabase.from('course_group_members')
        .select('student_id, profiles(full_name)')
        .eq('group_id', myGroup.id)
        .neq('student_id', user.id)
    : { data: [] }

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <Link href="/studente/corsi"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit">
          <ArrowLeft size={15} /> I miei corsi
        </Link>
        <div className="flex items-start gap-3 flex-wrap">
          <h2 className="text-2xl font-bold text-gray-900">{course.name}</h2>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium mt-1 flex-shrink-0 ${STATUS_COLORS[course.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABELS[course.status] ?? course.status}
          </span>
        </div>
        {course.description && (
          <p className="text-gray-500 text-sm mt-1">{course.description}</p>
        )}

        {/* Info riga */}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-500">
          {course.location && (
            <span className="flex items-center gap-1.5"><MapPin size={13} className="text-gray-400" />{course.location}</span>
          )}
          {course.start_date && (
            <span className="flex items-center gap-1.5">
              <Calendar size={13} className="text-gray-400" />
              {new Date(course.start_date).toLocaleDateString('it-IT')}
              {course.end_date && ` → ${new Date(course.end_date).toLocaleDateString('it-IT')}`}
            </span>
          )}
          {oreTotali && (
            <span className="flex items-center gap-1.5">
              <Clock size={13} className="text-gray-400" />{oreTotali} ore totali
            </span>
          )}
          {docenti.length > 0 && (
            <span className="flex items-center gap-1.5">
              <UserCheck size={13} className="text-gray-400" />{docenti.map(d => d.full_name).join(', ')}
            </span>
          )}
        </div>

        {/* Quick links */}
        <div className="mt-4 flex gap-2 flex-wrap">
          <Link href={`/studente/corsi/${id}/task`}
            className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 transition">
            <ClipboardList size={13} /> Task
            {pendingTasks.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                {pendingTasks.length}
              </span>
            )}
          </Link>
          <Link href={`/studente/corsi/${id}/presenze`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition">
            <Award size={13} /> Presenze
          </Link>
          {(quizCount ?? 0) > 0 && (
            <Link href={`/studente/corsi/${id}/quiz`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 transition">
              <GraduationCap size={13} /> Quiz & Esami
            </Link>
          )}
          <Link href={`/studente/corsi/${id}/calendario`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition">
            <CalendarCheck size={13} /> Calendario
          </Link>
          <Link href={`/studente/corsi/${id}/annunci`}
            className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition">
            <Megaphone size={13} /> Annunci
            {(announcementCount ?? 0) > 0 && (
              <span className="ml-0.5 text-xs bg-indigo-200 text-indigo-800 px-1.5 rounded-full font-bold">
                {announcementCount}
              </span>
            )}
          </Link>
          <Link href={`/studente/corsi/${id}/materiali`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-50 text-orange-700 hover:bg-orange-100 transition">
            <BookMarked size={13} /> Materiali
            {visibleMaterials.length > 0 && (
              <span className="ml-0.5 text-xs bg-orange-200 text-orange-800 px-1.5 rounded-full font-bold">
                {visibleMaterials.length}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* ── Task in evidenza ───────────────────────────────────────────────── */}
      {pendingTasks.length > 0 && (
        <div className={`rounded-xl border p-4 space-y-2 ${overdueTasks.length > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className={overdueTasks.length > 0 ? 'text-red-500' : 'text-amber-500'} />
            <p className={`text-sm font-semibold ${overdueTasks.length > 0 ? 'text-red-800' : 'text-amber-800'}`}>
              {overdueTasks.length > 0
                ? `${overdueTasks.length} task scadut${overdueTasks.length === 1 ? 'a' : 'e'} — contatta il docente`
                : `${pendingTasks.length} task da consegnare`}
            </p>
          </div>
          <div className="space-y-1">
            {pendingTasks.slice(0, 3).map(t => (
              <Link key={t.id} href={`/studente/corsi/${id}/task/${t.id}`}
                className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-white border border-amber-100 hover:border-amber-300 transition group">
                <span className="font-medium text-gray-700 group-hover:text-amber-800 truncate">{t.title}</span>
                {t.due_date && (
                  <span className={`flex-shrink-0 ml-2 ${t.due_date < today ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                    <Clock size={10} className="inline mr-0.5" />
                    {new Date(t.due_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                  </span>
                )}
              </Link>
            ))}
            {pendingTasks.length > 3 && (
              <Link href={`/studente/corsi/${id}/task`}
                className="text-xs text-amber-600 hover:underline block text-center pt-1">
                Vedi tutte →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Task tutti completati ──────────────────────────────────────────── */}
      {myVisibleTasks.length > 0 && pendingTasks.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">
          <CheckCircle size={15} /> Tutte le task sono state consegnate.
        </div>
      )}

      {/* ── Calendario anteprima — SEMPRE VISIBILE ─────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarCheck size={15} className="text-blue-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Calendario lezioni</h3>
          </div>
          <div className="flex items-center gap-3">
            {nextSession && (
              <span className="text-xs text-gray-500">
                Prossima: <strong className="text-blue-700">
                  {new Date(nextSession.session_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                </strong>
              </span>
            )}
            <Link href={`/studente/corsi/${id}/calendario`}
              className="text-xs text-blue-600 hover:underline">
              Apri →
            </Link>
          </div>
        </div>
        {sessionDates.length > 0 ? (
          <MiniCalendario sessionDates={sessionDates} compact />
        ) : (
          <div className="py-8 text-center">
            <CalendarCheck size={28} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nessuna data pianificata.</p>
            <p className="text-xs text-gray-400 mt-0.5">Le date delle lezioni verranno aggiunte dal docente.</p>
          </div>
        )}
      </div>

      {/* ── Presenze — SEMPRE VISIBILE ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award size={15} className={totalPast > 0 && isSogliaSuperata ? 'text-red-500' : 'text-green-600'} />
            <h3 className="font-semibold text-gray-900 text-sm">Presenze</h3>
          </div>
          {totalPast > 0 && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              isSogliaSuperata ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {isSogliaSuperata ? 'Soglia superata' : 'In regola'}
            </span>
          )}
        </div>

        {totalPast === 0 ? (
          <div className="py-6 text-center">
            <Award size={28} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nessuna presenza registrata.</p>
            <p className="text-xs text-gray-400 mt-0.5">Le presenze vengono registrate dal docente ad ogni lezione.</p>
          </div>
        ) : (
          <>
            {/* Barra */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{presentCount} presenti · {absentCount} assenti su {totalPast} giornate</span>
                <span className="font-semibold">{100 - pctAssenza}% frequenza</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isSogliaSuperata ? 'bg-red-400' : 'bg-green-500'}`}
                  style={{ width: `${100 - pctAssenza}%` }}
                />
              </div>
            </div>

            {/* Numeri ore */}
            <div className="flex flex-wrap gap-4">
              <div>
                <p className={`text-xl font-bold ${absentCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {oreAssenza !== null ? `${oreAssenza}h` : absentCount}
                </p>
                <p className="text-xs text-gray-400">{oreAssenza !== null ? 'ore assenza' : 'sessioni assenti'}</p>
              </div>
              {oreMassime !== null && (
                <div>
                  <p className="text-xl font-bold text-gray-400">{oreMassime}h</p>
                  <p className="text-xs text-gray-400">massimo (10%)</p>
                </div>
              )}
              {oreTotali && (
                <div>
                  <p className="text-xl font-bold text-gray-600">{oreTotali}h</p>
                  <p className="text-xs text-gray-400">ore totali</p>
                </div>
              )}
            </div>
          </>
        )}

        <Link href={`/studente/corsi/${id}/presenze`}
          className="text-xs text-blue-600 hover:underline block mt-3">
          Dettaglio presenze →
        </Link>
      </div>

      {/* ── Il mio gruppo ──────────────────────────────────────────────────── */}
      {myGroup && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Users size={15} className="text-indigo-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Il mio gruppo — {myGroup.name}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            <div className="p-4 space-y-1.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Docenti</p>
              {myGroup.course_group_instructors.map(i => (
                <div key={i.instructor_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-50">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#1EB8E5' }}>
                    {i.profiles?.full_name.charAt(0) ?? '?'}
                  </div>
                  <span className="text-sm text-gray-800 font-medium">{i.profiles?.full_name}</span>
                </div>
              ))}
              {myGroup.course_group_instructors.length === 0 && (
                <p className="text-xs text-gray-400">Nessun docente assegnato.</p>
              )}
            </div>
            <div className="p-4 space-y-1.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Compagni</p>
              {(groupmates ?? []).map(m => (
                <div key={m.student_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-green-50">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                    {(m.profiles as unknown as { full_name: string } | null)?.full_name.charAt(0) ?? '?'}
                  </div>
                  <span className="text-sm text-gray-800 font-medium truncate">
                    {(m.profiles as unknown as { full_name: string } | null)?.full_name}
                  </span>
                </div>
              ))}
              {(groupmates ?? []).length === 0 && (
                <p className="text-xs text-gray-400">Nessun compagno nel gruppo.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Materiali (preview — server rendered, no client component) ──────── */}
      {visibleMaterials.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <BookMarked size={15} className="text-orange-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Materiali</h3>
            <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
              {visibleMaterials.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {visibleMaterials.slice(0, 5).map(m => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                <FileIcon type={(m as { file_type: string | null }).file_type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                  {(m as { file_size: number | null }).file_size && (
                    <p className="text-xs text-gray-400">{formatSize((m as { file_size: number | null }).file_size)}</p>
                  )}
                </div>
                {(m as { file_url: string }).file_url && (
                  <a
                    href={(m as { file_url: string }).file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition flex-shrink-0"
                  >
                    <Download size={14} />
                  </a>
                )}
              </div>
            ))}
          </div>
          {visibleMaterials.length > 5 && (
            <div className="px-5 py-3 border-t border-gray-50">
              <Link href={`/studente/corsi/${id}/materiali`}
                className="text-xs text-blue-600 hover:underline">
                Vedi tutti i {visibleMaterials.length} materiali →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
