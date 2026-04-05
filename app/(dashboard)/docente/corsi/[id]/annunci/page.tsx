export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Megaphone, Paperclip, Download } from 'lucide-react'
import NuovoAnnuncioForm from './NuovoAnnuncioForm'
import EliminaAnnuncioBtn from './EliminaAnnuncioBtn'

export default async function DocenteAnnunciPage({ params }: { params: Promise<{ id: string }> }) {
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
    { data: annunci },
  ] = await Promise.all([
    supabase.from('courses').select('id, name').eq('id', id).single(),
    supabase.from('course_announcements')
      .select('id, title, content, created_at, attachment_url, attachment_name, attachment_size, attachment_type, profiles(full_name)')
      .eq('course_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!course) notFound()

  function formatSize(bytes: number | null) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  type Annuncio = {
    id: string
    title: string
    content: string
    created_at: string
    attachment_url: string | null
    attachment_name: string | null
    attachment_size: number | null
    attachment_type: string | null
    profiles: { full_name: string } | null
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/docente/corsi/${id}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition mb-3 w-fit"
        >
          <ArrowLeft size={15} /> {course.name}
        </Link>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Bacheca annunci</h2>
            {annunci && annunci.length > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                {annunci.length}
              </span>
            )}
          </div>
          <NuovoAnnuncioForm courseId={id} />
        </div>
      </div>

      <div className="space-y-4">
        {(annunci as unknown as Annuncio[] ?? []).map(a => (
          <div key={a.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">{a.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(a.created_at).toLocaleDateString('it-IT', {
                    day: '2-digit', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                  {a.profiles && ` · ${a.profiles.full_name}`}
                </p>
              </div>
              <EliminaAnnuncioBtn annuncioId={a.id} />
            </div>
            <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{a.content}</p>
            {a.attachment_url && (
              <a
                href={a.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition text-xs text-gray-700 hover:text-blue-700 group"
              >
                <Paperclip size={11} className="text-gray-400 group-hover:text-blue-500" />
                <span className="font-medium truncate max-w-[240px]">{a.attachment_name}</span>
                {a.attachment_size && (
                  <span className="text-gray-400 flex-shrink-0">{formatSize(a.attachment_size)}</span>
                )}
                <Download size={11} className="text-gray-400 group-hover:text-blue-500 ml-0.5 flex-shrink-0" />
              </a>
            )}
          </div>
        ))}
        {(!annunci || annunci.length === 0) && (
          <div className="text-center py-16 text-gray-400">
            <Megaphone size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nessun annuncio pubblicato.</p>
            <p className="text-xs mt-1">Crea il primo annuncio per i corsisti.</p>
          </div>
        )}
      </div>
    </div>
  )
}
