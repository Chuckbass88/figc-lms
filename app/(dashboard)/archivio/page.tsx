export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { FolderOpen } from 'lucide-react'
import ArchivioDocumentiClient from './ArchivioDocumentiClient'

/**
 * Archivio Documenti — web app
 * Visibile a docente e super_admin.
 * Mostra la libreria globale di file, template e link.
 * Ogni documento può essere abilitato nei singoli corsi (gestione separata).
 */
export default async function ArchivioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Controllo ruolo — solo docente e super_admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['docente', 'super_admin'].includes(profile.role)) notFound()

  const isAdmin = profile.role === 'super_admin'

  // Fetch documenti con nome uploader
  const { data: docs } = await supabase
    .from('document_library')
    .select('*, profiles!uploaded_by(full_name)')
    .order('created_at', { ascending: false })

  type RawDoc = {
    id: string
    title: string
    description: string | null
    file_url: string | null
    file_type: string | null
    file_size: number | null
    category: 'template' | 'document' | 'link'
    external_url: string | null
    is_template: boolean
    uploaded_by: string
    created_at: string
    profiles: { full_name: string } | null
  }

  const initialDocs = (docs as unknown as RawDoc[] ?? []).map(d => ({
    ...d,
    uploader_name: d.profiles?.full_name ?? undefined,
  }))

  const totalCount = initialDocs.length
  const templateCount = initialDocs.filter(d => d.category === 'template').length
  const linkCount = initialDocs.filter(d => d.category === 'link').length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <FolderOpen size={22} className="text-amber-600" />
            <h2 className="text-2xl font-bold text-gray-900">Archivio Documenti</h2>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {totalCount} {totalCount === 1 ? 'elemento' : 'elementi'} in libreria
            {templateCount > 0 && ` · ${templateCount} template`}
            {linkCount > 0 && ` · ${linkCount} link`}
          </p>
        </div>
      </div>

      {/* Info box — abilita nei corsi */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <FolderOpen size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          <strong>Archivio centrale:</strong> carica file, template e link qui, poi abilita quelli rilevanti
          direttamente nel <strong>dettaglio di ogni corso</strong> (tab Materiali → Archivio corso).
        </p>
      </div>

      {/* Client component con interattività */}
      <ArchivioDocumentiClient
        initialDocs={initialDocs}
        userId={user.id}
        canManage={true}
        isAdmin={isAdmin}
      />
    </div>
  )
}
