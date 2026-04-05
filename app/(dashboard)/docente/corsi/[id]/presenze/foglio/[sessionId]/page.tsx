import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import PrintButton from '@/app/(dashboard)/studente/corsi/[id]/attestato/PrintButton'

export default async function FoglioFirme({ params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = await params
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
    { data: session },
    { data: enrollments },
  ] = await Promise.all([
    supabase.from('courses').select('id, name, location').eq('id', id).single(),
    supabase.from('course_sessions').select('id, title, session_date').eq('id', sessionId).eq('course_id', id).single(),
    supabase.from('course_enrollments')
      .select('profiles(id, full_name)')
      .eq('course_id', id)
      .eq('status', 'active'),
  ])

  if (!course || !session) notFound()

  const students = (enrollments ?? [])
    .map(e => e.profiles as unknown as { id: string; full_name: string } | null)
    .filter(Boolean)
    .sort((a, b) => a!.full_name.localeCompare(b!.full_name)) as { id: string; full_name: string }[]

  const sessionDate = new Date(session.session_date).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Controlli (non stampati) */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/docente/corsi/${id}/presenze`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          <ArrowLeft size={15} /> Registro presenze
        </Link>
        <PrintButton />
      </div>

      {/* Documento stampabile */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:border-0 print:rounded-none">
        {/* Header CoachLab */}
        <div className="px-8 pt-8 pb-5 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #1B3768 0%, #1565C0 100%)' }}>
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-coachlab.png" alt="CoachLab" className="h-8 w-auto object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
          </div>
          <h1 className="text-xl font-black text-white mt-4 tracking-wide">FOGLIO PRESENZE</h1>
        </div>

        {/* Info sessione */}
        <div className="px-8 py-5 border-b border-gray-100 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Corso</p>
            <p className="text-sm font-semibold text-gray-900">{course.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Sessione</p>
            <p className="text-sm font-semibold text-gray-900">{session.title}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Data</p>
            <p className="text-sm font-semibold text-gray-900 capitalize">{sessionDate}</p>
          </div>
          {course.location && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Sede</p>
              <p className="text-sm font-semibold text-gray-900">{course.location}</p>
            </div>
          )}
        </div>

        {/* Tabella corsisti */}
        <div className="px-8 py-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 w-8">#</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3">Cognome e Nome</th>
                <th className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 w-24">Firma</th>
                <th className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 w-24">Presente</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                  <td className="py-3.5 text-xs text-gray-400 pr-4">{i + 1}</td>
                  <td className="py-3.5 text-sm font-medium text-gray-900">{s.full_name}</td>
                  <td className="py-3.5 border-l border-gray-100">
                    {/* Spazio firma */}
                    <div className="mx-3 h-6 border-b border-gray-300" />
                  </td>
                  <td className="py-3.5 border-l border-gray-100 text-center">
                    <div className="w-5 h-5 border-2 border-gray-300 rounded mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {students.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Nessun corsista iscritto.</p>
          )}

          {/* Footer */}
          <div className="mt-8 pt-5 border-t border-gray-100 flex items-end justify-between text-xs text-gray-400">
            <div>
              <p>Docente/Responsabile: ___________________________</p>
              <p className="mt-3">Firma: ___________________________</p>
            </div>
            <div className="text-right">
              <p>{students.length} corsisti iscritti</p>
              <p className="mt-1">CoachLab — Formazione Allenatori</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
