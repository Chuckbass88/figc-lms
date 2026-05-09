import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ArchivioCorsoDocenteClient from './ArchivioCorsoDocenteClient'

export default async function ArchivioCorsoDocentePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: fileCorso }, { data: corso }] = await Promise.all([
    supabase
      .from('corso_archivio')
      .select('*, file:archivio_generale(*, area:aree(id, nome))')
      .eq('corso_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('courses').select('id, name').eq('id', id).single(),
  ])

  return (
    <ArchivioCorsoDocenteClient
      fileCorso={fileCorso ?? []}
      corso={corso}
      corsoId={id}
    />
  )
}
