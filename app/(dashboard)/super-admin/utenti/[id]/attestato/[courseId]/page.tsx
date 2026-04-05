import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import PrintButton from '@/app/(dashboard)/studente/corsi/[id]/attestato/PrintButton'

export default async function AdminAttestato({ params }: { params: Promise<{ id: string; courseId: string }> }) {
  const { id: studentId, courseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'super_admin') notFound()

  const [
    { data: student },
    { data: course },
    { data: sessions },
    { data: instructors },
    { data: enrollment },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', studentId).single(),
    supabase.from('courses').select('id, name, description, location, start_date, end_date, status, category').eq('id', courseId).single(),
    supabase.from('course_sessions').select('id, title, session_date').eq('course_id', courseId).order('session_date'),
    supabase.from('course_instructors').select('profiles(full_name)').eq('course_id', courseId),
    supabase.from('course_enrollments').select('status').eq('course_id', courseId).eq('student_id', studentId).single(),
  ])

  if (!student || !course || !enrollment) notFound()

  const sessionIds = (sessions ?? []).map(s => s.id)
  const { data: attendances } = sessionIds.length > 0
    ? await supabase.from('attendances').select('session_id, present').in('session_id', sessionIds).eq('student_id', studentId)
    : { data: [] }

  const totalSessions = sessions?.length ?? 0
  const presentSessions = (attendances ?? []).filter(a => a.present).length
  const pct = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0
  const docenti = instructors?.map(r => (r.profiles as unknown as { full_name: string } | null)?.full_name).filter(Boolean) ?? []
  const today = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
  const isSufficient = pct >= 75

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/super-admin/utenti/${studentId}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          <ArrowLeft size={15} /> {student.full_name}
        </Link>
        <PrintButton />
      </div>

      <div
        id="attestato"
        className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:border-0 print:rounded-none"
      >
        <div className="px-10 pt-10 pb-6 text-center border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #1B3768 0%, #1565C0 100%)' }}>
          <div className="flex items-center justify-center gap-4 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-coachlab.png" alt="CoachLab" className="h-10 w-auto object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide mt-2">ATTESTATO DI FREQUENZA</h1>
        </div>

        <div className="px-10 py-8 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-gray-500 text-sm uppercase tracking-widest">Si attesta che</p>
            <p className="text-3xl font-black text-gray-900">{student.full_name}</p>
            <p className="text-gray-500 text-sm">{student.email}</p>
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

          {docenti.length > 0 && (
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                {docenti.length === 1 ? 'Docente' : 'Docenti'}
              </p>
              <p className="text-sm font-medium text-gray-700">{docenti.join(' · ')}</p>
            </div>
          )}

          <div className="border-t border-gray-100 pt-5 flex items-end justify-between text-xs text-gray-400">
            <p>Rilasciato il {today}</p>
            <p>CoachLab — Formazione Allenatori</p>
          </div>
        </div>
      </div>

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
