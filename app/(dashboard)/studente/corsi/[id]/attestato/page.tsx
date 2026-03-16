import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Printer } from 'lucide-react'
import PrintButton from './PrintButton'

export default async function Attestato({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Verifica iscrizione
  const { data: enrollment } = await supabase
    .from('course_enrollments')
    .select('status, enrolled_at')
    .eq('course_id', id)
    .eq('student_id', user.id)
    .single()

  if (!enrollment) notFound()

  const [
    { data: course },
    { data: profile },
    { data: sessions },
    { data: instructors },
  ] = await Promise.all([
    supabase.from('courses').select('id, name, description, location, start_date, end_date, status, category').eq('id', id).single(),
    supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
    supabase.from('course_sessions').select('id, title, session_date').eq('course_id', id).order('session_date'),
    supabase.from('course_instructors').select('profiles(full_name)').eq('course_id', id),
  ])

  if (!course || !profile) notFound()

  const sessionIds = (sessions ?? []).map(s => s.id)

  const { data: attendances } = sessionIds.length > 0
    ? await supabase
        .from('attendances')
        .select('session_id, present')
        .in('session_id', sessionIds)
        .eq('student_id', user.id)
    : { data: [] }

  const totalSessions = sessions?.length ?? 0
  const presentSessions = (attendances ?? []).filter(a => a.present).length
  const pct = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0
  const docenti = instructors?.map(r => (r.profiles as unknown as { full_name: string } | null)?.full_name).filter(Boolean) ?? []

  const today = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

  const isSufficient = pct >= 75

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Controlli (non stampati) */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/studente/corsi/${id}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          <ArrowLeft size={15} /> Torna al corso
        </Link>
        <PrintButton />
      </div>

      {/* Documento stampabile */}
      <div
        id="attestato"
        className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:border-0 print:rounded-none"
      >
        {/* Header FIGC */}
        <div className="px-10 pt-10 pb-6 text-center border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #001233 0%, #003DA5 100%)' }}>
          <div className="flex items-center justify-center gap-4 mb-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #E8C96A 100%)' }}
            >
              <span className="font-black text-base tracking-tight" style={{ color: '#001233' }}>FIGC</span>
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-lg leading-tight">Federazione Italiana Giuoco Calcio</p>
              <p className="text-blue-200 text-sm">Settore Tecnico — Formazione Allenatori</p>
            </div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide mt-2">ATTESTATO DI FREQUENZA</h1>
        </div>

        {/* Corpo */}
        <div className="px-10 py-8 space-y-6">
          {/* Testo principale */}
          <div className="text-center space-y-2">
            <p className="text-gray-500 text-sm uppercase tracking-widest">Si attesta che</p>
            <p className="text-3xl font-black text-gray-900">{profile.full_name}</p>
            <p className="text-gray-500 text-sm">{profile.email}</p>
          </div>

          <div className="text-center">
            <p className="text-gray-600">ha frequentato il corso di formazione</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{course.name}</p>
            {course.category && (
              <span className="inline-block mt-2 text-sm px-3 py-1 rounded-full font-semibold bg-indigo-100 text-indigo-700">
                {course.category}
              </span>
            )}
          </div>

          {/* Dettagli corso */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-5">
            {course.location && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Sede</p>
                <p className="text-sm font-medium text-gray-800">{course.location}</p>
              </div>
            )}
            {course.start_date && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Periodo</p>
                <p className="text-sm font-medium text-gray-800">
                  {new Date(course.start_date).toLocaleDateString('it-IT')}
                  {course.end_date && ` — ${new Date(course.end_date).toLocaleDateString('it-IT')}`}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Sessioni totali</p>
              <p className="text-sm font-medium text-gray-800">{totalSessions}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Sessioni frequentate</p>
              <p className="text-sm font-medium text-gray-800">{presentSessions} su {totalSessions}</p>
            </div>
          </div>

          {/* % presenze con badge */}
          <div className="text-center">
            <div className={`inline-flex flex-col items-center gap-2 px-8 py-4 rounded-2xl border-2 ${
              isSufficient ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'
            }`}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Percentuale di frequenza</p>
              <p className={`text-5xl font-black ${isSufficient ? 'text-green-700' : 'text-amber-600'}`}>{pct}%</p>
              <span className={`text-xs font-semibold px-3 py-0.5 rounded-full ${
                isSufficient ? 'bg-green-200 text-green-800' : 'bg-amber-200 text-amber-800'
              }`}>
                {isSufficient ? 'IDONEO' : 'NON IDONEO'}
              </span>
            </div>
          </div>

          {/* Docenti */}
          {docenti.length > 0 && (
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                {docenti.length === 1 ? 'Docente' : 'Docenti'}
              </p>
              <p className="text-sm font-medium text-gray-700">{docenti.join(' · ')}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-100 pt-5 flex items-end justify-between text-xs text-gray-400">
            <p>Rilasciato il {today}</p>
            <p>FIGC LMS — Formazione Allenatori</p>
          </div>
        </div>
      </div>

      {/* Info non sufficiente */}
      {!isSufficient && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 print:hidden">
          <p className="text-amber-800 text-sm">
            <strong>Attenzione:</strong> la frequenza ({pct}%) è inferiore alla soglia minima del 75% richiesta per l&apos;idoneità.
          </p>
        </div>
      )}
    </div>
  )
}
