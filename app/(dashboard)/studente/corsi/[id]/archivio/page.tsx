import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FileText } from 'lucide-react'

export default async function ArchivioCorsoStudentePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: fileAbilitati }, { data: corso }] = await Promise.all([
    supabase
      .from('corso_archivio')
      .select('*, file:archivio_generale(nome, file_url, file_name, tipo, file_size)')
      .eq('corso_id', id)
      .eq('abilitato', true)
      .order('created_at', { ascending: false }),
    supabase.from('courses').select('id, name').eq('id', id).single(),
  ])

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold" style={{ color: '#1B3768' }}>
        Archivio File — {corso?.name}
      </h1>
      {(!fileAbilitati || fileAbilitati.length === 0) ? (
        <p className="text-sm" style={{ color: 'rgba(27,55,104,0.5)' }}>
          Nessun file disponibile per questo corso.
        </p>
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(27,55,104,0.1)', background: 'rgba(255,255,255,0.55)' }}>
          {fileAbilitati.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-t first:border-t-0"
              style={{ borderColor: 'rgba(27,55,104,0.06)' }}>
              <FileText size={16} style={{ color: '#0891B2' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#1B3768' }}>
                  {item.file?.nome}
                </p>
                <p className="text-xs" style={{ color: 'rgba(27,55,104,0.5)' }}>
                  {item.file?.tipo}{item.file?.file_size ? ` · ${Math.round(item.file.file_size / 1024)}KB` : ''}
                </p>
              </div>
              <a href={item.file?.file_url} target="_blank" rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'rgba(8,145,178,0.08)', color: '#0891B2' }}>
                Scarica
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
