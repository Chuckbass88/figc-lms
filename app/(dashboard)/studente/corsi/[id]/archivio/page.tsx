import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { FileText, Video, FileSpreadsheet, File, ExternalLink, FolderOpen } from 'lucide-react'

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ tipo }: { tipo: string | null }) {
  const t = (tipo ?? '').toUpperCase()
  if (t === 'PDF') return <FileText size={16} style={{ color: '#EF4444' }} />
  if (t === 'PPTX') return <Video size={16} style={{ color: '#F97316' }} />
  if (t === 'XLSX') return <FileSpreadsheet size={16} style={{ color: '#16A34A' }} />
  if (t === 'DOC') return <FileText size={16} style={{ color: '#2563EB' }} />
  return <File size={16} style={{ color: '#0891B2' }} />
}

interface ArchivioFile {
  id: string
  nome: string
  file_url: string
  file_name: string
  file_size: number | null
  tipo: string | null
  created_at: string
}

export default async function ArchivioCorsoStudentePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verifica iscrizione attiva
  const { data: enrollment } = await supabase
    .from('course_enrollments')
    .select('status')
    .eq('course_id', id)
    .eq('student_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!enrollment) notFound()

  const { data: corso } = await supabase.from('courses').select('id, name').eq('id', id).single()
  if (!corso) notFound()

  // Admin client: archivio_generale non ha policy SELECT per studenti.
  // Sicurezza garantita dal check iscrizione + filtro corso_id + abilitato.
  const admin = createAdminClient()
  const { data: links } = await admin
    .from('corso_archivio')
    .select('id, created_at, file:archivio_generale(id, nome, file_url, file_name, file_size, tipo)')
    .eq('corso_id', id)
    .eq('abilitato', true)
    .order('created_at', { ascending: false })

  const files: ArchivioFile[] = (links ?? [])
    .map(l => {
      const f = (l as unknown as { file: Omit<ArchivioFile, 'created_at'> | null }).file
      if (!f) return null
      return { ...f, created_at: (l as { created_at: string }).created_at }
    })
    .filter(Boolean) as ArchivioFile[]

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <FolderOpen size={18} style={{ color: '#1B3768' }} />
        <h1 className="text-xl font-bold" style={{ color: '#1B3768' }}>
          Archivio File — {corso.name}
        </h1>
      </div>

      {files.length === 0 ? (
        <div className="rounded-2xl p-12 text-center"
          style={{ border: '1px dashed rgba(27,55,104,0.15)', background: 'rgba(255,255,255,0.5)' }}>
          <FolderOpen size={32} className="mx-auto mb-3" style={{ color: 'rgba(27,55,104,0.2)' }} />
          <p className="text-sm" style={{ color: 'rgba(27,55,104,0.4)' }}>
            Nessun file disponibile per questo corso.
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(27,55,104,0.35)' }}>
            I file abilitati dal docente appariranno qui.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(27,55,104,0.1)', background: 'rgba(255,255,255,0.55)' }}>
          {files.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 px-4 py-3 border-t first:border-t-0"
              style={{ borderColor: 'rgba(27,55,104,0.06)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(27,55,104,0.06)' }}>
                <FileIcon tipo={doc.tipo} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#1B3768' }}>{doc.nome}</p>
                <p className="text-xs" style={{ color: 'rgba(27,55,104,0.4)' }}>
                  {doc.file_name}{doc.file_size ? ` · ${formatBytes(doc.file_size)}` : ''}
                </p>
              </div>
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium flex-shrink-0 transition hover:opacity-80"
                style={{ background: 'rgba(8,145,178,0.1)', color: '#0891B2' }}>
                <ExternalLink size={12} /> Scarica
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
