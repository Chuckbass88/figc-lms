import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, GraduationCap, Lock, CheckCircle, XCircle } from 'lucide-react'
import { calcolaVotiCorso } from '@/lib/voti'

export const dynamic = 'force-dynamic'

export default async function EsameFinalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (profile as { role?: string } | null)?.role
  if (role !== 'docente' && role !== 'super_admin' && role !== 'admin') notFound()

  if (role === 'docente') {
    const { data: isInstr } = await supabase
      .from('course_instructors').select('instructor_id')
      .eq('course_id', id).eq('instructor_id', user.id).maybeSingle()
    if (!isInstr) notFound()
  }

  const { data: course } = await supabase.from('courses').select('id, name').eq('id', id).single()
  if (!course) notFound()

  const voti = await calcolaVotiCorso(supabase, id)
  const conEsame = voti.studenti.filter(s => s.esameScore30 != null)
  const superati = conEsame.filter(s => s.esameSuperato).length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={`/docente/corsi/${id}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit">
          <ArrowLeft size={15} /> {course.name}
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <GraduationCap size={20} className="text-purple-600" /> Esame finale
        </h2>
        <p className="text-gray-500 text-sm mt-1 flex items-center gap-1.5">
          <Lock size={12} /> Risultati privati — soglia superamento 18/30
        </p>
      </div>

      {conEsame.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{conEsame.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">esami svolti</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{superati}</p>
            <p className="text-xs text-gray-500 mt-0.5">superati</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{conEsame.length - superati}</p>
            <p className="text-xs text-gray-500 mt-0.5">non superati</p>
          </div>
        </div>
      )}

      {voti.studenti.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-16 text-center">
          <GraduationCap size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nessuno studente iscritto al corso.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-5 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <span>Studente</span>
            <span className="text-center w-16">Voto /30</span>
            <span className="text-center w-16">Corrette</span>
            <span className="text-center w-14">Errori</span>
            <span className="text-center w-24">Esito</span>
          </div>
          <div className="divide-y divide-gray-50">
            {voti.studenti.map(s => (
              <div key={s.studentId}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-5 py-3 items-center">
                <span className="text-sm font-medium text-gray-900 truncate">{s.fullName}</span>
                <span className={`text-center w-16 text-base font-bold ${
                  s.esameScore30 == null ? 'text-gray-300' :
                  s.esameSuperato ? 'text-green-700' : 'text-red-600'
                }`}>
                  {s.esameScore30 ?? '—'}
                </span>
                <span className="text-center w-16 text-sm text-green-600 font-medium">
                  {s.esameCorrette ?? '—'}
                </span>
                <span className="text-center w-14 text-sm text-red-500 font-medium">
                  {s.esameErrori ?? '—'}
                </span>
                <span className="w-24 flex justify-center">
                  {s.esameScore30 == null ? (
                    <span className="text-xs text-gray-400 italic">non svolto</span>
                  ) : s.esameSuperato ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                      <CheckCircle size={11} /> Superato
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                      <XCircle size={11} /> Non sup.
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
