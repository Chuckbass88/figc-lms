import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'
import NuovaValutazioneForm from './NuovaValutazioneForm'

export default async function NuovaValutazionePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
    { data: enrollments },
    { data: templates },
  ] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', id).single(),
    supabase.from('course_enrollments')
      .select('profiles(id, full_name)')
      .eq('course_id', id)
      .eq('status', 'active'),
    supabase.from('evaluation_templates')
      .select(`
        id, name, description,
        evaluation_template_sections(
          id, name, position,
          evaluation_template_criteria(id, name, position)
        )
      `)
      .eq('is_global', true)
      .order('created_at', { ascending: true }),
  ])

  if (!course) notFound()

  const students = (enrollments ?? [])
    .map(r => r.profiles)
    .filter(Boolean) as unknown as { id: string; full_name: string }[]

  // Normalizza sections/criteria con ordine
  type RawTemplate = {
    id: string; name: string; description: string | null
    evaluation_template_sections: {
      id: string; name: string; position: number
      evaluation_template_criteria: { id: string; name: string; position: number }[]
    }[]
  }

  const normalizedTemplates = (templates as unknown as RawTemplate[] ?? []).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    sections: [...t.evaluation_template_sections]
      .sort((a, b) => a.position - b.position)
      .map(s => ({
        id: s.id,
        name: s.name,
        position: s.position,
        criteria: [...s.evaluation_template_criteria].sort((a, b) => a.position - b.position),
      })),
  }))

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-0 py-3 mb-5">
        <Link
          href={`/docente/corsi/${id}/valutazioni`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-2 w-fit"
        >
          <ArrowLeft size={15} /> Valutazioni
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: '#1565C0' }}>
            <ClipboardCheck size={15} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 leading-tight">Nuova valutazione pratica</h2>
            <p className="text-xs text-gray-400 truncate">{course.name}</p>
          </div>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-400">Nessun corsista iscritto al corso.</p>
        </div>
      ) : (
        <NuovaValutazioneForm
          courseId={id}
          students={students}
          templates={normalizedTemplates}
        />
      )}
    </div>
  )
}
