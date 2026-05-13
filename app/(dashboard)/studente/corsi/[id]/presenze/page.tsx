import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Calendar, Check, X, Clock, AlertTriangle, ShieldCheck, Award } from 'lucide-react'

export default async function StudentePresenze({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

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
    supabase.from('courses').select('id, name, ore_totali').eq('id', id).single(),
    supabase.from('course_sessions')
      .select('id, title, session_date, attendances(student_id, present)')
      .eq('course_id', id)
      .order('session_date', { ascending: false }),
  ])

  if (!course) notFound()

  const sessionList = sessions ?? []
  const today = new Date().toISOString().split('T')[0]

  const myAttendances = sessionList.map(s => ({
    ...s,
    myPresence: s.attendances.find((a: { student_id: string; present: boolean }) => a.student_id === user.id),
  }))

  const pastSessions = myAttendances.filter(s => s.session_date <= today)
  const presentCount = pastSessions.filter(s => s.myPresence?.present === true).length
  const absentCount = pastSessions.filter(s => s.myPresence?.present === false).length
  const totalPast = pastSessions.length

  const oreTotali = (course as unknown as { ore_totali: number | null }).ore_totali
  const totalSessionCount = sessionList.length

  // Hours-based when ore_totali is configured
  const useOre = oreTotali && totalSessionCount > 0
  const orePerSessione = useOre ? oreTotali / totalSessionCount : null
  const oreAssenza = useOre ? absentCount * orePerSessione! : null
  const oreMassime = useOre ? oreTotali * 0.10 : null
  const isSogliaSuperata = useOre ? oreAssenza! > oreMassime! : absentCount / Math.max(totalPast, 1) > 0.25

  // Progress bar: % of max-absence budget consumed
  const assenzaPct = useOre && oreMassime! > 0
    ? Math.min(Math.round((oreAssenza! / oreMassime!) * 100), 100)
    : totalPast > 0 ? Math.round((absentCount / totalPast) * 100) : 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/studente/corsi/${id}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
        >
          <ArrowLeft size={15} /> {course.name}
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar size={20} className="text-blue-600" />
          Le mie presenze
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          {totalPast} giornate registrate · {sessionList.length} totali
        </p>
      </div>

      {totalPast === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-16 text-center">
          <Calendar size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nessuna giornata registrata per questo corso.</p>
        </div>
      ) : (
        <>
          {/* Riepilogo */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
            {useOre ? (
              /* Hours-based stats */
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className={`text-3xl font-bold ${isSogliaSuperata ? 'text-red-600' : 'text-gray-800'}`}>
                      {oreAssenza!.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">ore assenza</p>
                  </div>
                  <div className="text-center border-x border-gray-100">
                    <p className="text-3xl font-bold text-gray-400">{oreMassime!.toFixed(1)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">ore massime</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-800">{oreTotali}</p>
                    <p className="text-xs text-gray-500 mt-0.5">ore totali corso</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isSogliaSuperata ? 'bg-red-500' : assenzaPct > 60 ? 'bg-amber-400' : 'bg-green-500'}`}
                      style={{ width: `${assenzaPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {assenzaPct}% del limite di assenza utilizzato
                  </p>
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-3 flex-wrap">
                  {isSogliaSuperata ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-red-100 text-red-700">
                      <AlertTriangle size={12} /> Soglia assenza superata
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-green-100 text-green-700">
                      <ShieldCheck size={12} /> In regola
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {presentCount} presenze · {absentCount} assenze su {totalPast} giornate
                  </span>
                </div>
              </>
            ) : (
              /* Fallback: session-% */
              <>
                <div className="flex items-end gap-4">
                  <div>
                    <p className={`text-4xl font-bold ${presentCount / Math.max(totalPast, 1) >= 0.75 ? 'text-green-600' : 'text-red-500'}`}>
                      {totalPast > 0 ? Math.round((presentCount / totalPast) * 100) : 0}%
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {presentCount} presenze su {totalPast} sessioni
                    </p>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${presentCount / Math.max(totalPast, 1) >= 0.75 ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${totalPast > 0 ? Math.round((presentCount / totalPast) * 100) : 0}%` }}
                  />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${!isSogliaSuperata ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <Award size={12} /> {!isSogliaSuperata ? 'Idoneo' : 'Non idoneo'}
                  </span>
                  <span className="text-xs text-gray-400">(soglia: 75%)</span>
                  {!isSogliaSuperata && (
                    <Link
                      href={`/studente/corsi/${id}/attestato`}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg text-white hover:opacity-90 transition"
                      style={{ backgroundColor: '#0891B2' }}
                    >
                      <Award size={12} /> Scarica attestato
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Attestato (hours-mode, in regola) */}
          {useOre && !isSogliaSuperata && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-blue-600" />
                <p className="text-sm text-blue-800 font-medium">Presenze sufficienti per l&apos;attestato</p>
              </div>
              <Link
                href={`/studente/corsi/${id}/attestato`}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition flex-shrink-0"
                style={{ backgroundColor: '#0891B2' }}
              >
                <Award size={12} /> Scarica attestato
              </Link>
            </div>
          )}

          {/* Lista sessioni */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Clock size={14} className="text-gray-400" />
              <h3 className="font-semibold text-gray-900 text-sm">Dettaglio giornate</h3>
              {useOre && orePerSessione && (
                <span className="ml-auto text-xs text-gray-400">{orePerSessione.toFixed(1)}h per giornata</span>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {myAttendances.map(s => {
                const isPresent = s.myPresence?.present === true
                const isAbsent = s.myPresence?.present === false
                const registered = !!s.myPresence
                const isFuture = s.session_date > today
                const d = new Date(s.session_date)
                return (
                  <div key={s.id} className="px-5 py-3 flex items-center gap-4">
                    <div className={`w-9 h-9 flex-shrink-0 rounded-lg flex flex-col items-center justify-center text-center ${
                      isFuture ? 'bg-gray-50 text-gray-400' :
                      isPresent ? 'bg-green-100 text-green-700' :
                      isAbsent ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      <span className="text-xs font-bold leading-tight">
                        {d.toLocaleDateString('it-IT', { day: '2-digit' })}
                      </span>
                      <span className="text-[10px] uppercase leading-tight">
                        {d.toLocaleDateString('it-IT', { month: 'short' })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {s.title || d.toLocaleDateString('it-IT', { weekday: 'long' })}
                      </p>
                      <p className="text-xs text-gray-400">
                        {d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {isFuture ? (
                        <span className="text-xs text-gray-400 italic">In programma</span>
                      ) : !registered ? (
                        <span className="text-xs text-gray-400 italic">—</span>
                      ) : isPresent ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                          <Check size={12} /> Presente
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                          <X size={12} /> Assente
                          {useOre && orePerSessione && (
                            <span className="font-normal text-red-400">· {orePerSessione.toFixed(1)}h</span>
                          )}
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
