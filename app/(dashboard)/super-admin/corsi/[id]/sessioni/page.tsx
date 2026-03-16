import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import SessioniClient from './SessioniClient'

export default async function GestioneSessioni({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: course }, { data: sessions }] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', id).single(),
    supabase
      .from('course_sessions')
      .select('id, title, session_date')
      .eq('course_id', id)
      .order('session_date', { ascending: true }),
  ])

  if (!course) notFound()

  // Presenze per le sessioni passate
  const today = new Date().toISOString().split('T')[0]
  const pastIds = (sessions ?? []).filter(s => s.session_date < today).map(s => s.id)
  const { data: attData } = pastIds.length > 0
    ? await supabase.from('attendances').select('session_id, present').in('session_id', pastIds)
    : { data: [] }

  const attBySession = new Map<string, { present: number; total: number }>()
  for (const a of attData ?? []) {
    const e = attBySession.get(a.session_id) ?? { present: 0, total: 0 }
    e.total++
    if (a.present) e.present++
    attBySession.set(a.session_id, e)
  }

  const sessionsWithAtt = (sessions ?? []).map(s => ({
    ...s,
    att: attBySession.get(s.id) ?? null,
  }))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href={`/super-admin/corsi/${id}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
        >
          <ArrowLeft size={15} /> {course.name}
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Gestione Sessioni</h2>
        <p className="text-gray-500 text-sm mt-1">{course.name}</p>
      </div>

      <SessioniClient courseId={id} initialSessions={sessionsWithAtt} />
    </div>
  )
}
