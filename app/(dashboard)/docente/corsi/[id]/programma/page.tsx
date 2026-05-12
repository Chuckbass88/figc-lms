import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Layers, CalendarRange } from 'lucide-react'
import ProgrammaTab from '@/components/programma/ProgrammaTab'
import type { CorsoEvento, CorsoPresenza } from '@/lib/types'

export default async function DocenteProgrammaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'admin'

  // Verifica che il docente sia assegnato al corso (o sia super_admin/admin)
  if (!isSuperAdmin) {
    const { data: instr } = await supabase
      .from('course_instructors').select('instructor_id')
      .eq('course_id', id).eq('instructor_id', user.id).single()
    if (!instr) redirect('/docente')
  }

  const [
    { data: corso },
    { data: eventi },
    { data: enrollments },
    { data: presenzeAll },
  ] = await Promise.all([
    supabase.from('courses').select('id, name, location, start_date, end_date').eq('id', id).single(),
    supabase.from('corso_eventi').select('*').eq('corso_id', id).order('data').order('ora_inizio'),
    supabase.from('course_enrollments').select('profiles(id, full_name)').eq('course_id', id).eq('status', 'active'),
    supabase.from('corso_presenze').select('*').eq('corso_id', id),
  ])

  if (!corso) notFound()

  const studenti = (enrollments ?? [])
    .map(e => e.profiles as unknown as { id: string; full_name: string } | null)
    .filter(Boolean) as { id: string; full_name: string }[]

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href={`/docente/corsi/${id}`} className="flex items-center gap-1.5 text-sm mb-2 transition"
          style={{ color: 'rgba(27,55,104,0.5)' }}>
          <ArrowLeft size={14} /> {corso.name}
        </Link>
        <h1 className="text-xl font-bold mb-3" style={{ color: '#1B3768' }}>{corso.name}</h1>
        <div className="flex gap-1.5 flex-wrap">
          <Link href={`/docente/corsi/${id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition">
            <Layers size={14} /> Panoramica
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#1B3768' }}>
            <CalendarRange size={14} /> Programma
          </span>
        </div>
      </div>

      <ProgrammaTab
        corsoId={id}
        corseName={corso.name}
        corseLocation={corso.location}
        corseStartDate={corso.start_date}
        corseEndDate={corso.end_date}
        eventi={(eventi ?? []) as CorsoEvento[]}
        studenti={studenti}
        presenzeAll={(presenzeAll ?? []) as CorsoPresenza[]}
        canEdit={true}
        canManage={isSuperAdmin}
      />
    </div>
  )
}
