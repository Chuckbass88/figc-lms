import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FileText, Image, Video, FileSpreadsheet, File, Link2, ExternalLink, FolderOpen } from 'lucide-react'

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ mime, category }: { mime: string | null; category: string }) {
  if (category === 'link') return <Link2 size={16} style={{ color: '#0891B2' }} />
  const m = mime ?? ''
  if (m.includes('pdf')) return <FileText size={16} style={{ color: '#EF4444' }} />
  if (m.startsWith('image')) return <Image size={16} style={{ color: '#A855F7' }} />
  if (m.startsWith('video')) return <Video size={16} style={{ color: '#F97316' }} />
  if (m.includes('sheet') || m.includes('excel') || m.includes('csv')) return <FileSpreadsheet size={16} style={{ color: '#16A34A' }} />
  return <File size={16} style={{ color: '#0891B2' }} />
}

export default async function ArchivioCorsoStudentePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: links }, { data: corso }] = await Promise.all([
    supabase
      .from('document_course_links')
      .select('document_id, document_library(id, title, description, file_url, file_type, file_size, category, external_url)')
      .eq('course_id', id),
    supabase.from('courses').select('id, name').eq('id', id).single(),
  ])

  const files = (links ?? []).map(l => l.document_library as any).filter(Boolean)

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <FolderOpen size={18} style={{ color: '#1B3768' }} />
        <h1 className="text-xl font-bold" style={{ color: '#1B3768' }}>
          Archivio File — {corso?.name}
        </h1>
      </div>

      {files.length === 0 ? (
        <div className="rounded-2xl p-12 text-center"
          style={{ border: '1px dashed rgba(27,55,104,0.15)', background: 'rgba(255,255,255,0.5)' }}>
          <FolderOpen size={32} className="mx-auto mb-3" style={{ color: 'rgba(27,55,104,0.2)' }} />
          <p className="text-sm" style={{ color: 'rgba(27,55,104,0.4)' }}>
            Nessun file disponibile per questo corso.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(27,55,104,0.1)', background: 'rgba(255,255,255,0.55)' }}>
          {files.map((doc: any) => {
            const href = doc.category === 'link' ? (doc.external_url ?? '#') : (doc.file_url ?? '#')
            return (
              <div key={doc.id} className="flex items-center gap-3 px-4 py-3 border-t first:border-t-0"
                style={{ borderColor: 'rgba(27,55,104,0.06)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(27,55,104,0.06)' }}>
                  <FileIcon mime={doc.file_type} category={doc.category} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#1B3768' }}>{doc.title}</p>
                  {doc.description && (
                    <p className="text-xs truncate" style={{ color: 'rgba(27,55,104,0.5)' }}>{doc.description}</p>
                  )}
                  {doc.file_size ? (
                    <p className="text-xs" style={{ color: 'rgba(27,55,104,0.4)' }}>{formatBytes(doc.file_size)}</p>
                  ) : null}
                </div>
                <a href={href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium flex-shrink-0 transition hover:opacity-80"
                  style={{ background: 'rgba(8,145,178,0.1)', color: '#0891B2' }}>
                  <ExternalLink size={12} />
                  {doc.category === 'link' ? 'Apri' : 'Scarica'}
                </a>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
