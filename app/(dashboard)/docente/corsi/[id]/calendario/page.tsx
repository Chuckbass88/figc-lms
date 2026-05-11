import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, CalendarCheck, Layers, CalendarRange } from 'lucide-react'
import CalendarioTabella from '@/components/corso/CalendarioTabella'
import type { CorsoEvento } from '@/lib/types'

export default async function DocenteCalendarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'docente') redirect('/docente')

  const { data: assigned } = await supabase
    .from('course_instructors').select('id').eq('course_id', id).eq('instructor_id', user.id).single()
  if (!assigned) notFound()

  const { data: corso } = await supabase.from('courses').select('id, name, location').eq('id', id).single()
  if (!corso) notFound()

  const { data: eventi } = await supabase
    .from('corso_eventi').select('*').eq('corso_id', id).order('data').order('ora_inizio')

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/docente/corsi" className="flex items-center gap-1.5 text-sm mb-2"
          style={{ color: 'rgba(27,55,104,0.5)' }}>
          <ArrowLeft size={14} /> I miei corsi
        </Link>
        <h1 className="text-xl font-bold" style={{ color: '#1B3768' }}>{corso.name}</h1>
        <div className="flex gap-1.5 flex-wrap mt-3">
          <Link href={`/docente/corsi/${id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition">
            <Layers size={14} /> Panoramica
          </Link>
          <Link href={`/docente/corsi/${id}/programma`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition">
            <CalendarRange size={14} /> Programma
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#1B3768' }}>
            <CalendarCheck size={14} /> Calendario
          </span>
        </div>
      </div>

      <CalendarioTabella
        corsoId={id}
        corsoNome={corso.name}
        eventi={(eventi ?? []) as CorsoEvento[]}
        canShare={true}
      />
    </div>
  )
}
