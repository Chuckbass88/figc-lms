import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, BookMarked, FileText, FileImage, FileSpreadsheet, File, Download } from 'lucide-react'

function FileIcon({ type }: { type: string | null }) {
  const t = type?.toLowerCase()
  if (t === 'pdf') return <FileText size={20} className="text-red-500 flex-shrink-0" />
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(t ?? '')) return <FileImage size={20} className="text-blue-500 flex-shrink-0" />
  if (['xlsx', 'xls', 'csv'].includes(t ?? '')) return <FileSpreadsheet size={20} className="text-green-600 flex-shrink-0" />
  return <File size={20} className="text-gray-400 flex-shrink-0" />
}

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default async function MaterialiStudentePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: enrollment } = await supabase
    .from('course_enrollments')
    .select('status')
    .eq('course_id', id)
    .eq('student_id', user.id)
    .single()

  if (!enrollment) notFound()

  const [{ data: course }, { data: materials }, { data: myGroupRow }] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', id).single(),
    supabase.from('course_materials')
      .select('id, name, description, file_url, file_type, file_size, created_at, target_type, target_id')
      .eq('course_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('course_groups')
      .select('id, course_group_members!inner(student_id)')
      .eq('course_id', id)
      .eq('course_group_members.student_id', user.id)
      .maybeSingle(),
  ])

  if (!course) notFound()

  const myGroupId = (myGroupRow as { id: string } | null)?.id ?? null

  const visible = (materials ?? []).filter(m => {
    const tt = (m as { target_type?: string | null }).target_type ?? 'all'
    const ti = (m as { target_id?: string | null }).target_id ?? null
    if (tt === 'all') return true
    if (tt === 'group') return ti === myGroupId
    if (tt === 'student') return ti === user.id
    return true
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/studente/corsi/${id}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
        >
          <ArrowLeft size={15} /> {course.name}
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookMarked size={20} className="text-orange-600" />
          Materiali del corso
        </h2>
        <p className="text-gray-500 text-sm mt-1">{visible.length} materiali disponibili</p>
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-16 text-center">
          <BookMarked size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nessun materiale disponibile per questo corso.</p>
          <p className="text-xs text-gray-400 mt-1">I materiali caricati dal docente appariranno qui.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {visible.map(m => {
              const mat = m as {
                id: string; name: string; description: string | null
                file_url: string | null; file_type: string | null; file_size: number | null; created_at: string
              }
              return (
                <div key={mat.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition">
                  <FileIcon type={mat.file_type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{mat.name}</p>
                    {mat.description && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{mat.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {mat.file_type?.toUpperCase()}
                      {mat.file_size ? ` · ${formatSize(mat.file_size)}` : ''}
                      {' · '}{new Date(mat.created_at).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                  {mat.file_url && (
                    <a
                      href={mat.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition flex-shrink-0"
                    >
                      <Download size={13} /> Scarica
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
