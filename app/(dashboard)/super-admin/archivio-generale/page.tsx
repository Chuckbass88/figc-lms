import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ArchivioPaginaClient from './ArchivioPaginaClient'

export default async function ArchivioPaginaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: files }, { data: aree }, { data: corsi }] = await Promise.all([
    supabase
      .from('archivio_generale')
      .select('*, area:aree(id, nome), corso_origine:courses(id, name)')
      .order('created_at', { ascending: false }),
    supabase.from('aree').select('*').order('nome'),
    supabase.from('courses').select('id, name').order('name'),
  ])

  return (
    <ArchivioPaginaClient
      files={files ?? []}
      aree={aree ?? []}
      corsi={corsi ?? []}
    />
  )
}
