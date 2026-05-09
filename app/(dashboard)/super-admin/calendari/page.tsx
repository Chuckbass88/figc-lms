import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalendariClient from './CalendariClient'

export default async function CalendariPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch 2 months back + 4 months ahead for smooth month navigation
  const now = new Date()
  const da = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0]
  const a = new Date(now.getFullYear(), now.getMonth() + 5, 0).toISOString().split('T')[0]

  const [{ data: eventi }, { data: corsi }, { data: docenti }] = await Promise.all([
    supabase
      .from('corso_eventi')
      .select(`
        *,
        corso:courses(id, name),
        docenti:corso_eventi_docenti(docente_id, stato, profile:profiles(id, full_name))
      `)
      .gte('data', da)
      .lte('data', a)
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
