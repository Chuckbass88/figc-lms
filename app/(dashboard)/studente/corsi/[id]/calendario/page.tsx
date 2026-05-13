import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, CalendarCheck } from 'lucide-react'
import MiniCalendario from '@/components/calendario/MiniCalendario'

export default async function StudenteCalendarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: enrolled } = await supabase
    .from('course_enrollments').select('id')
    .eq('course_id', id).eq('student_id', user.id).eq('status', 'active').single()
  if (!enrolled) notFound()

  const [
    { data: corso },
    { data: sessions },
  ] = await Promise.all([
    supabase.from('courses').select('id, name, start_date, end_date').eq('id', id).single(),
    supabase.from('course_sessions')
      .select('id, title, session_date')
      .eq('course_id', id)
      .order('session_date', { ascending: true }),
  ])

  if (!corso) notFound()

  const sessionDates = (sessions ?? []).map(s => s.session_date as string)
  const today = new Date().toISOString().split('T')[0]
  const nextSession = (sessions ?? []).find(s => s.session_date >= today)
  const pastCount = (sessions ?? []).filter(s => s.session_date < today).length

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/studente/corsi/${id}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
        >
          <ArrowLeft size={15} /> {corso.name}
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarCheck size={20} className="text-blue-600" />
          Calendario del corso
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          {sessions?.length ?? 0} giornate totali · {pastCount} passate · {(sessions?.length ?? 0) - pastCount} future
        </p>
      </div>

      {/* Prossima sessione */}
      {nextSession && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
          <CalendarCheck size={16} className="text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Prossima giornata</p>
            <p className="text-sm font-bold text-blue-900">
              {new Date(nextSession.session_date).toLocaleDateString('it-IT', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })}
            </p>
            {nextSession.title && (
              <p className="text-xs text-blue-600 mt-0.5">{nextSession.title}</p>
            )}
          </div>
        </div>
      )}

      {/* Calendario grafico */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        {sessionDates.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Nessuna sessione pianificata.</p>
        ) : (
          <MiniCalendario sessionDates={sessionDates} />
        )}
      </div>

      {/* Lista sessioni per mese */}
      {(sessions ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Tutte le giornate</h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {(sessions ?? []).map(s => {
              const d = new Date(s.session_date)
              const isPast = s.session_date < today
              const isToday = s.session_date === today
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-4 px-5 py-2.5 ${isToday ? 'bg-blue-50' : ''}`}
                >
                  <div className={`w-9 h-9 flex-shrink-0 rounded-lg flex flex-col items-center justify-center text-center ${
                    isToday ? 'bg-blue-600 text-white' :
                    isPast ? 'bg-gray-100 text-gray-400' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    <span className="text-xs font-bold leading-tight">
                      {d.toLocaleDateString('it-IT', { day: '2-digit' })}
                    </span>
                    <span className="text-[10px] uppercase leading-tight">
                      {d.toLocaleDateString('it-IT', { month: 'short' })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isPast && !isToday ? 'text-gray-400' : 'text-gray-800'}`}>
                      {s.title || d.toLocaleDateString('it-IT', { weekday: 'long' })}
                    </p>
                    {isToday && <span className="text-xs font-semibold text-blue-600">Oggi</span>}
                  </div>
                  <span className={`text-xs flex-shrink-0 ${isPast ? 'text-gray-300' : 'text-blue-400'}`}>
                    {d.toLocaleDateString('it-IT', { weekday: 'short' })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
