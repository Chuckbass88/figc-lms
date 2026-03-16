import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Calendar, Check, X, TrendingUp, Award } from 'lucide-react'

export default async function StudentePresenze({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Verifica iscrizione
  const { data: enrollment } = await supabase
    .from('course_enrollments')
    .select('status')
    .eq('course_id', id)
    .eq('student_id', user.id)
    .single()

  if (!enrollment) notFound()

  const [
    { data: course },
    { data: sessions },
  ] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', id).single(),
    supabase.from('course_sessions')
      .select('id, title, session_date, attendances(student_id, present)')
      .eq('course_id', id)
      .order('session_date', { ascending: false }),
  ])

  if (!course) notFound()

  const sessionList = sessions ?? []

  // Solo le presenze di questo studente
  const myAttendances = sessionList.map(s => ({
    ...s,
    myPresence: s.attendances.find(a => a.student_id === user.id),
  }))

  const totalSessions = sessionList.length
  const presentCount = myAttendances.filter(s => s.myPresence?.present).length
  const pct = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/studente/corsi/${id}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
        >
          <ArrowLeft size={15} /> {course.name}
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Le mie presenze</h2>
        <p className="text-gray-500 text-sm mt-1">{totalSessions} sessioni registrate</p>
      </div>

      {totalSessions === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Calendar size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nessuna sessione registrata per questo corso.</p>
        </div>
      ) : (
        <>
          {/* Riepilogo */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={15} className="text-indigo-600" />
              <p className="text-sm font-semibold text-gray-900">Riepilogo</p>
            </div>
            <div className="flex items-end gap-4">
              <div>
                <p className={`text-4xl font-bold ${pct !== null && pct >= 75 ? 'text-green-600' : pct !== null && pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                  {pct !== null ? `${pct}%` : '—'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {presentCount} presenze su {totalSessions} sessioni
                </p>
              </div>
            </div>
            {pct !== null && (
              <>
                <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Award size={14} className={pct >= 75 ? 'text-green-600' : 'text-red-500'} />
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${pct >= 75 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {pct >= 75 ? 'Idoneo' : 'Non idoneo'}
                    </span>
                    <span className="text-xs text-gray-400">(soglia: 75%)</span>
                  </div>
                  {pct >= 75 && (
                    <Link
                      href={`/studente/corsi/${id}/attestato`}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg text-white hover:opacity-90 transition"
                      style={{ backgroundColor: '#003DA5' }}
                    >
                      <Award size={12} /> Scarica attestato
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Lista sessioni */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Calendar size={15} className="text-gray-500" />
              <h3 className="font-semibold text-gray-900 text-sm">Dettaglio sessioni</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {myAttendances.map(s => {
                const isPresent = s.myPresence?.present ?? false
                const registered = !!s.myPresence
                return (
                  <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(s.session_date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {!registered ? (
                        <span className="text-xs text-gray-400 italic">Non registrato</span>
                      ) : isPresent ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                          <Check size={12} /> Presente
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                          <X size={12} /> Assente
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
