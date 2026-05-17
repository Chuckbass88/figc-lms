import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Award, ClipboardCheck, Star, GraduationCap, Lock, CheckCircle, XCircle } from 'lucide-react'
import { calcolaVotiCorso } from '@/lib/voti'

export const dynamic = 'force-dynamic'

function votoColor(v: number | null) {
  if (v == null) return 'text-gray-300'
  if (v >= 18) return 'text-green-700'
  if (v >= 15) return 'text-amber-600'
  return 'text-red-600'
}

export default async function VotoStudentePage({ params }: { params: Promise<{ id: string; studentId: string }> }) {
  const { id, studentId } = await params
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
  const s = voti.studenti.find(x => x.studentId === studentId)
  if (!s) notFound()

  const task30 = s.taskMedia10 != null ? Math.round(s.taskMedia10 * 3 * 10) / 10 : null
  const prat30 = s.praticheMedia10 != null ? Math.round(s.praticheMedia10 * 3 * 10) / 10 : null

  const Card = ({ label, icon, voto10, voto30, peso }: {
    label: string; icon: React.ReactNode; voto10: number | null; voto30: number | null; peso: number
  }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">peso {peso}%</span>
      </div>
      <div className="flex items-end gap-4">
        <div>
          <p className={`text-3xl font-bold ${votoColor(voto30)}`}>{voto30 ?? '—'}</p>
          <p className="text-xs text-gray-400 mt-0.5">su /30</p>
        </div>
        {voto10 != null && (
          <div className="pb-1">
            <p className="text-sm font-medium text-gray-500">{voto10}<span className="text-gray-300">/10</span></p>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <Link href={`/docente/corsi/${id}/voti`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit">
          <ArrowLeft size={15} /> Gestione voti
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">{s.fullName}</h2>
        <p className="text-gray-500 text-sm mt-1 flex items-center gap-1.5">
          <Lock size={12} /> {course.name} — scheda privata
        </p>
      </div>

      {/* Media finale grande */}
      <div className={`rounded-2xl border p-6 text-center ${
        s.mediaFinale30 == null ? 'bg-gray-50 border-gray-200' :
        s.mediaFinale30 >= 18 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Media finale ponderata</p>
        <p className={`text-5xl font-bold ${votoColor(s.mediaFinale30)}`}>
          {s.mediaFinale30 ?? '—'}<span className="text-2xl text-gray-300">/30</span>
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Pesi: Task {voti.pesoTask}% · Pratiche {voti.pesoPratiche}% · Esame {voti.pesoEsame}%
        </p>
      </div>

      {/* Schede per componente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card label="Task" icon={<ClipboardCheck size={15} className="text-amber-600" />}
          voto10={s.taskMedia10} voto30={task30} peso={voti.pesoTask} />
        <Card label="Prove pratiche" icon={<Star size={15} className="text-indigo-600" />}
          voto10={s.praticheMedia10} voto30={prat30} peso={voti.pesoPratiche} />
      </div>

      {/* Esame finale */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap size={15} className="text-purple-600" />
          <p className="text-sm font-semibold text-gray-900">Esame finale</p>
          <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">peso {voti.pesoEsame}%</span>
        </div>
        {s.esameScore30 == null ? (
          <p className="text-sm text-gray-400 py-3 text-center">Esame finale non ancora svolto.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className={`text-3xl font-bold ${votoColor(s.esameScore30)}`}>{s.esameScore30}<span className="text-lg text-gray-300">/30</span></p>
              <p className="text-xs text-gray-400 mt-0.5">punteggio</p>
            </div>
            {s.esameCorrette != null && (
              <div className="text-center">
                <p className="text-xl font-bold text-green-600">{s.esameCorrette}</p>
                <p className="text-xs text-gray-400">corrette</p>
              </div>
            )}
            {s.esameErrori != null && (
              <div className="text-center">
                <p className="text-xl font-bold text-red-500">{s.esameErrori}</p>
                <p className="text-xs text-gray-400">errori</p>
              </div>
            )}
            <div className="ml-auto">
              {s.esameSuperato ? (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
                  <CheckCircle size={14} /> Superato
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-full">
                  <XCircle size={14} /> Non superato
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
