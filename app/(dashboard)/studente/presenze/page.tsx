import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TrendingUp, Award, Calendar, Check, X, BookOpen, ChevronRight } from 'lucide-react'

export default async function StudentePresenzeAggregate() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Corsi iscritti
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('course_id, status, courses(id, name, status)')
    .eq('student_id', user.id)
    .eq('status', 'active')

  const courseIds = enrollments?.map(e => e.course_id) ?? []

  let courseStats: {
    courseId: string
    courseName: string
    courseStatus: string
    totalSessions: number
    presentCount: number
    pct: number | null
  }[] = []

  let totalPresent = 0
  let totalSessions = 0

  if (courseIds.length > 0) {
    const [{ data: sessions }, { data: attendances }] = await Promise.all([
      supabase
        .from('course_sessions')
        .select('id, course_id, title, session_date')
        .in('course_id', courseIds)
        .order('session_date', { ascending: false }),
      supabase
        .from('attendances')
        .select('session_id, present')
        .eq('student_id', user.id),
    ])

    const presentSet = new Set(
      (attendances ?? []).filter(a => a.present).map(a => a.session_id)
    )

    const sessionsByCourse = new Map<string, { id: string; title: string; session_date: string }[]>()
    for (const s of sessions ?? []) {
      if (!sessionsByCourse.has(s.course_id)) sessionsByCourse.set(s.course_id, [])
      sessionsByCourse.get(s.course_id)!.push(s)
    }

    courseStats = (enrollments ?? []).map(e => {
      const course = e.courses as unknown as { id: string; name: string; status: string } | null
      const sIds = sessionsByCourse.get(e.course_id) ?? []
      const present = sIds.filter(s => presentSet.has(s.id)).length
      const pct = sIds.length > 0 ? Math.round((present / sIds.length) * 100) : null

      totalPresent += present
      totalSessions += sIds.length

      return {
        courseId: e.course_id,
        courseName: course?.name ?? '—',
        courseStatus: course?.status ?? 'active',
        totalSessions: sIds.length,
        presentCount: present,
        pct,
      }
    }).sort((a, b) => (a.pct ?? -1) - (b.pct ?? -1)) // A rischio prima
  }

  const globalPct = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : null
  const idoneiCount = courseStats.filter(c => c.pct !== null && c.pct >= 75).length

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Le mie presenze</h2>
        <p className="text-gray-500 text-sm mt-1">Riepilogo aggregato di tutti i tuoi corsi</p>
      </div>

      {courseStats.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Calendar size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Non sei iscritto a nessun corso attivo.</p>
        </div>
      ) : (
        <>
          {/* KPI globale */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className={`text-3xl font-bold ${globalPct !== null && globalPct >= 75 ? 'text-green-600' : globalPct !== null && globalPct >= 50 ? 'text-amber-500' : globalPct !== null ? 'text-red-500' : 'text-gray-400'}`}>
                {globalPct !== null ? `${globalPct}%` : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Media presenze</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{totalPresent}<span className="text-lg text-gray-400">/{totalSessions}</span></p>
              <p className="text-xs text-gray-500 mt-1">Sessioni frequentate</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{idoneiCount}<span className="text-lg text-gray-400">/{courseStats.length}</span></p>
              <p className="text-xs text-gray-500 mt-1">Corsi con idoneità</p>
            </div>
          </div>

          {/* Lista corsi */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <BookOpen size={15} className="text-indigo-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Dettaglio per corso</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {courseStats.map(c => (
                <Link
                  key={c.courseId}
                  href={`/studente/corsi/${c.courseId}/presenze`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition truncate">
                      {c.courseName}
                    </p>
                    {c.totalSessions > 0 ? (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">{c.presentCount}/{c.totalSessions} sessioni</span>
                          {c.pct !== null && (
                            <span className={`text-xs font-bold ${c.pct >= 75 ? 'text-green-700' : c.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              {c.pct}%
                            </span>
                          )}
                        </div>
                        {c.pct !== null && (
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${c.pct >= 75 ? 'bg-green-500' : c.pct >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                              style={{ width: `${c.pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">Nessuna sessione registrata</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {c.pct !== null && c.totalSessions > 0 && (
                      <>
                        {c.pct >= 75 ? (
                          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                            <Check size={11} /> Idoneo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-600">
                            <X size={11} /> A rischio
                          </span>
                        )}
                        {c.pct >= 75 && (
                          <Link
                            href={`/studente/corsi/${c.courseId}/attestato`}
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg text-white hover:opacity-90 transition"
                            style={{ backgroundColor: '#003DA5' }}
                          >
                            <Award size={11} /> Attestato
                          </Link>
                        )}
                      </>
                    )}
                    <ChevronRight size={13} className="text-gray-300 group-hover:text-blue-400 transition" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Legenda soglia */}
          <div className="flex items-center gap-2 text-xs text-gray-400 justify-center">
            <TrendingUp size={12} />
            <span>Soglia idoneità: <strong className="text-gray-600">75%</strong> di presenze per corso</span>
          </div>
        </>
      )}
    </div>
  )
}
