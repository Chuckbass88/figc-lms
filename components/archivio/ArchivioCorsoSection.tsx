import { createClient } from '@/lib/supabase/server'
import { FolderOpen } from 'lucide-react'
import ArchivioCorsoClient, { type ArchivioDoc } from './ArchivioCorsoClient'

/**
 * ArchivioCorsoSection — server component
 * Fetcha documenti libreria + link abilitati per questo corso.
 * Usato nel dettaglio corso di super_admin e docente.
 */
export default async function ArchivioCorsoSection({ courseId }: { courseId: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch tutti i doc della libreria globale
  const { data: allDocs } = await supabase
    .from('document_library')
    .select('id, title, description, file_url, file_type, file_size, category, external_url, is_template, created_at')
    .order('created_at', { ascending: false })

  // Fetch i link abilitati per questo corso
  const { data: links } = await supabase
    .from('document_course_links')
    .select('document_id')
    .eq('course_id', courseId)

  const enabledIds = (links ?? []).map(l => l.document_id as string)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
        <FolderOpen size={15} className="text-amber-600" />
        <h3 className="font-semibold text-gray-900 text-sm">Archivio Documenti</h3>
        {enabledIds.length > 0 && (
          <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            {enabledIds.length} abilitati
          </span>
        )}
      </div>
      <ArchivioCorsoClient
        courseId={courseId}
        allDocs={(allDocs as unknown as ArchivioDoc[]) ?? []}
        enabledIds={enabledIds}
        currentUserId={user.id}
      />
    </div>
  )
}
