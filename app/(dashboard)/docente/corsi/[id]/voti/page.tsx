import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Award, ChevronRight, Lock } from 'lucide-react'
import { calcolaVotiCorso } from '@/lib/voti'

export const dynamic = 'force-dynamic'

function votoColor(v: number | null) {
  if (v == null) return 'text-gray-300'
  if (v >= 18) return 'text-green-700'
  if (v >= 15) return 'text-amber-600'
  return 'text-red-600'
}

export default async function VotiCorsoPage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href={`/docente/corsi/${id}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit">
          <ArrowLeft size={15} /> {course.name}
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Award size={20} className="text-blue-600" /> Gestione voti
        </h2>
        <p className="text-gray-500 text-sm mt-1 flex items-center gap-1.5">
          <Lock size={12} /> Pagina privata — non visibile agli studenti
        </p>
      </div>

      {/* Pesi */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="font-semibold text-blue-900">Pesi media:</span>
        <span className="text-blue-700">Task <strong>{voti.pesoTask}%</strong></span>
        <span className="text-blue-700">Pratiche <strong>{voti.pesoPratiche}%</strong></span>
        <span className="text-blue-700">Esame <strong>{voti.pesoEsame}%</strong></span>
        <span className="text-blue-500 text-xs ml-auto">
          Quiz intermedi: {voti.quizIntermediInMedia ? 'inclusi nelle task' : 'esclusi dalla media'}
        </span>
      </div>

      {voti.studenti.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-16 text-center">
          <Award size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nessuno studente iscritto al corso.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 px-5 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <span>Studente</span>
            <span className="text-center w-16">Task /10</span>
            <span className="text-center w-16">Prat. /10</span>
            <span className="text-center w-16">Esame /30</span>
            <span className="text-center w-20">Media /30</span>
            <span className="w-5" />
          </div>
          <div className="divide-y divide-gray-50">
            {voti.studenti.map(s => (
              <Link
                key={s.studentId}
                href={`/docente/corsi/${id}/voti/${s.studentId}`}
                className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 px-5 py-3 items-center hover:bg-gray-50 transition group"
              >
                <span className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700">{s.fullName}</span>
                <span className="text-center w-16 text-sm text-gray-600">{s.taskMedia10 ?? '—'}</span>
                <span className="text-center w-16 text-sm text-gray-600">{s.praticheMedia10 ?? '—'}</span>
                <span className={`text-center w-16 text-sm font-semibold ${votoColor(s.esameScore30)}`}>
                  {s.esameScore30 ?? '—'}
                </span>
                <span className={`text-center w-20 text-base font-bold ${votoColor(s.mediaFinale30)}`}>
                  {s.mediaFinale30 ?? '—'}
                </span>
                <ChevronRight size={15} className="text-gray-300 group-hover:text-blue-500 w-5" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
