import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, CalendarCheck, Download } from 'lucide-react'

export default async function StudenteCalendarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: enrolled } = await supabase
    .from('course_enrollments').select('id').eq('course_id', id).eq('student_id', user.id).eq('status', 'active').single()
  if (!enrolled) notFound()

  const { data: corso } = await supabase.from('courses').select('id, name').eq('id', id).single()
  if (!corso) notFound()

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/studente/corsi" className="flex items-center gap-1.5 text-sm mb-2"
          style={{ color: 'rgba(27,55,104,0.5)' }}>
          <ArrowLeft size={14} /> I miei corsi
        </Link>
        <h1 className="text-xl font-bold" style={{ color: '#1B3768' }}>{corso.name}</h1>
        <div className="flex gap-1.5 flex-wrap mt-3">
          <Link href={`/studente/corsi/${id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition">
            Panoramica
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#1B3768' }}>
            <CalendarCheck size={14} /> Calendario
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
        <CalendarCheck size={40} className="mx-auto" style={{ color: '#1EB8E5' }} />
        <div>
          <h2 className="text-base font-semibold" style={{ color: '#1B3768' }}>Calendario del corso</h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(27,55,104,0.5)' }}>
            Scarica il PDF del calendario per visualizzare il programma delle lezioni.
          </p>
        </div>
        <a
          href={`/api/corsi/${id}/calendario/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
          style={{ background: '#1EB8E5' }}>
          <Download size={14} /> Scarica PDF calendario
        </a>
      </div>
    </div>
  )
}
