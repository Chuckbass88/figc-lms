'use client'

import { useState } from 'react'
import {
  FileText, Image, Video, FileSpreadsheet, File, Link2,
  ExternalLink, Loader2, FolderOpen, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ArchivioDoc {
  id: string
  title: string
  description: string | null
  file_url: string | null
  file_type: string | null
  file_size: number | null
  category: 'template' | 'document' | 'link'
  external_url: string | null
  is_template: boolean
  created_at: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFileIcon(doc: ArchivioDoc) {
  if (doc.category === 'link') return <Link2 size={16} className="text-sky-500" />
  const mime = doc.file_type ?? ''
  if (mime.includes('pdf'))     return <FileText size={16} className="text-red-500" />
  if (mime.startsWith('image')) return <Image size={16} className="text-purple-500" />
  if (mime.startsWith('video')) return <Video size={16} className="text-orange-500" />
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv'))
    return <FileSpreadsheet size={16} className="text-green-600" />
  return <File size={16} className="text-blue-600" />
}

function getCategoryBadge(cat: string): string {
  if (cat === 'template') return 'bg-purple-100 text-purple-700'
  if (cat === 'link')     return 'bg-sky-100 text-sky-700'
  return 'bg-blue-100 text-blue-700'
}

function getCategoryLabel(cat: string): string {
  if (cat === 'template') return 'Template'
  if (cat === 'link')     return 'Link'
  return 'Documento'
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ArchivioCorsoClient({
  courseId,
  allDocs,
  enabledIds,
  currentUserId,
}: {
  courseId: string
  allDocs: ArchivioDoc[]
  enabledIds: string[]          // doc ids già abilitati per questo corso
  currentUserId: string
}) {
  const [enabled, setEnabled] = useState<Set<string>>(new Set(enabledIds))
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const enabledDocs  = allDocs.filter(d => enabled.has(d.id))
  const disabledDocs = allDocs.filter(d => !enabled.has(d.id))

  async function toggle(docId: string) {
    if (loadingId) return
    setLoadingId(docId)
    const supabase = createClient()

    try {
      if (enabled.has(docId)) {
        // Disabilita — rimuove il link
        const { error } = await supabase
          .from('document_course_links')
          .delete()
          .eq('document_id', docId)
          .eq('course_id', courseId)
        if (error) throw error
        setEnabled(prev => { const s = new Set(prev); s.delete(docId); return s })
      } else {
        // Abilita — inserisce il link
        const { error } = await supabase
          .from('document_course_links')
          .insert({ document_id: docId, course_id: courseId, enabled_by: currentUserId })
        if (error) throw error
        setEnabled(prev => new Set([...prev, docId]))
      }
    } catch (err) {
      console.error('Errore toggle documento:', err)
    } finally {
      setLoadingId(null)
    }
  }

  const docHref = (doc: ArchivioDoc) =>
    doc.category === 'link' ? (doc.external_url ?? '#') : (doc.file_url ?? '#')

  return (
    <div className="space-y-5">

      {/* Sezione: Abilitati per questo corso */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Abilitati per questo corso ({enabledDocs.length})
        </p>
        {enabledDocs.length === 0 ? (
          <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-8 text-center">
            <FolderOpen size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              Nessun documento abilitato. Usa la libreria qui sotto per aggiungerne.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-50">
            {enabledDocs.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-green-50/30 transition">
                {/* Icona */}
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {getFileIcon(doc)}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={docHref(doc)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-gray-900 hover:text-blue-700 transition truncate"
                    >
                      {doc.title}
                    </a>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${getCategoryBadge(doc.category)}`}>
                      {getCategoryLabel(doc.category)}
                    </span>
                  </div>
                  {doc.description && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{doc.description}</p>
                  )}
                </div>
                {/* Azioni */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <a href={docHref(doc)} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"
                    title="Apri">
                    <ExternalLink size={13} />
                  </a>
                  <button
                    onClick={() => toggle(doc.id)}
                    disabled={loadingId === doc.id}
                    title="Disabilita per questo corso"
                    className="flex items-center gap-1 text-xs text-green-700 hover:text-red-600 transition font-medium disabled:opacity-50"
                  >
                    {loadingId === doc.id
                      ? <Loader2 size={16} className="animate-spin" />
                      : <ToggleRight size={20} className="text-green-500 hover:text-red-400 transition" />
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sezione: Libreria disponibile */}
      {allDocs.length > 0 && (
        <div>
          <button
            onClick={() => setShowAll(v => !v)}
            className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 hover:text-gray-600 transition"
          >
            {showAll ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Libreria disponibile ({disabledDocs.length} da abilitare)
          </button>

          {showAll && (
            <>
              {disabledDocs.length === 0 ? (
                <p className="text-xs text-gray-400 px-1">Tutti i documenti della libreria sono già abilitati per questo corso.</p>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-50">
                  {disabledDocs.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 px-4 py-3 opacity-70 hover:opacity-100 transition group">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {getFileIcon(doc)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-700 truncate">{doc.title}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${getCategoryBadge(doc.category)}`}>
                            {getCategoryLabel(doc.category)}
                          </span>
                        </div>
                        {doc.description && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{doc.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => toggle(doc.id)}
                        disabled={loadingId === doc.id}
                        title="Abilita per questo corso"
                        className="flex items-center gap-1 flex-shrink-0 text-xs text-gray-400 hover:text-green-600 transition disabled:opacity-50"
                      >
                        {loadingId === doc.id
                          ? <Loader2 size={16} className="animate-spin" />
                          : <ToggleLeft size={20} className="text-gray-400 hover:text-green-500 transition" />
                        }
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {allDocs.length === 0 && (
        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <FolderOpen size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            Nessun documento nella libreria. Vai su{' '}
            <a href="/archivio" className="text-blue-600 hover:underline font-medium">Archivio Documenti</a>
            {' '}per aggiungerne.
          </p>
        </div>
      )}
    </div>
  )
}
