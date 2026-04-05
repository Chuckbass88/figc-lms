export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, ClipboardCheck, Plus } from 'lucide-react'
import ValutazioniClient from './ValutazioniClient'

export default async function ValutazioniPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isSuperAdmin = profile?.role === 'super_admin'

  if (!isSuperAdmin) {
    const { data: isInstructor } = await supabase
      .from('course_instructors').select('instructor_id')
      .eq('course_id', id).eq('instructor_id', user.id).single()
    if (!isInstructor) notFound()
  }

  const [
    { data: course },
    { data: enrollments },
    { data: practicalRaw },
    { data: openRaw },
  ] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', id).single(),
    supabase.from('course_enrollments')
      .select('profiles(id, full_name)').eq('course_id', id).eq('status', 'active'),
    supabase.from('practical_evaluations')
      .select(`
        id, student_id, evaluation_date, session_label, final_score, global_note,
        evaluation_templates(name),
        profiles!practical_evaluations_student_id_fkey(full_name),
        practical_evaluation_scores(
          score, note,
          evaluation_template_criteria(
            name,
            evaluation_template_sections(name)
          )
        )
      `)
      .eq('course_id', id)
      .order('evaluation_date', { ascending: false }),
    supabase.from('course_evaluations')
      .select('id, student_id, voto, tipo, commento, created_at, profiles!course_evaluations_student_id_fkey(full_name)')
      .eq('course_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!course) notFound()

  const students = (enrollments ?? [])
    .map(r => r.profiles)
    .filter(Boolean) as unknown as { id: string; full_name: string }[]

  // Normalizza practical evaluations
  type RawPractical = {
    id: string; student_id: string; evaluation_date: string
    session_label: string | null; final_score: number | null; global_note: string | null
    evaluation_templates: { name: string } | null
    profiles: { full_name: string } | null
    practical_evaluation_scores: {
      score: number; note: string | null
      evaluation_template_criteria: {
        name: string
        evaluation_template_sections: { name: string } | null
      } | null
    }[]
  }

  const practical = (practicalRaw as unknown as RawPractical[] ?? []).map(ev => ({
    id: ev.id,
    student_id: ev.student_id,
    evaluation_date: ev.evaluation_date,
    session_label: ev.session_label,
    final_score: ev.final_score,
    global_note: ev.global_note,
    template_name: ev.evaluation_templates?.name ?? 'Valutazione',
    student_name: ev.profiles?.full_name ?? '—',
    scores: ev.practical_evaluation_scores.map(s => ({
      criterion_name: s.evaluation_template_criteria?.name ?? '',
      section_name: s.evaluation_template_criteria?.evaluation_template_sections?.name ?? '',
      score: s.score,
      note: s.note,
    })),
  }))

  type RawOpen = {
    id: string; student_id: string; voto: number; tipo: string
    commento: string | null; created_at: string
    profiles: { full_name: string } | null
  }

  const openEvals = (openRaw as unknown as RawOpen[] ?? []).map(ev => ({
    id: ev.id,
    student_id: ev.student_id,
    student_name: ev.profiles?.full_name ?? '—',
    voto: ev.voto,
    tipo: ev.tipo,
    commento: ev.commento,
    created_at: ev.created_at,
  }))

  const total = practical.length + openEvals.length

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <Link href={`/docente/corsi/${id}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit">
          <ArrowLeft size={15} /> {course.name}
        </Link>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={18} className="text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Valutazioni</h2>
            {total > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{total}</span>
            )}
          </div>
          <Link
            href={`/docente/corsi/${id}/valutazioni/nuova`}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white font-semibold hover:opacity-90 transition"
            style={{ backgroundColor: '#1565C0' }}
          >
            <Plus size={12} /> Nuova valutazione pratica
          </Link>
        </div>
      </div>

      <ValutazioniClient
        courseId={id}
        students={students}
        initialPractical={practical}
        initialOpen={openEvals}
      />
    </div>
  )
}
