import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalendariClient from './CalendariClient'

export default async function CalendariPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const oggi = new Date().toISOString().split('T')[0]
  const fra60 = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0]

  const [{ data: eventi }, { data: corsi }, { data: docenti }] = await Promise.all([
    supabase
      .from('corso_eventi')
      .select(`
        *,
        corso:courses(id, name),
        docenti:corso_eventi_docenti(docente_id, stato, profile:profiles(id, full_name))
      `)
      .gte('data', oggi)
      .lte('data', fra60)
      .order('data', { ascending: true })
      .order('ora_inizio', { ascending: true }),
    supabase.from('courses').select('id, name').eq('status', 'active').order('name'),
    supabase.from('profiles').select('id, full_name').eq('role', 'docente').order('full_name'),
  ])

  return (
    <CalendariClient
      eventi={eventi ?? []}
      corsi={corsi ?? []}
      docenti={docenti ?? []}
    />
  )
}
