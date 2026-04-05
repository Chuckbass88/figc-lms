import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GuideClient from '@/components/guida/GuideClient'
import { STUDENTE_SECTIONS, STUDENTE_QUICK_ACTIONS } from '@/components/guida/guideDataStudente'

export default async function GuidaStudentePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  // Solo studente e super_admin possono vedere questa guida
  // (super_admin può vederla per testarla)
  if (profile?.role === 'docente') redirect('/guida/docente')

  return (
    <GuideClient
      role="studente"
      userName={profile?.full_name ?? 'Corsista'}
      sections={STUDENTE_SECTIONS}
      quickActions={STUDENTE_QUICK_ACTIONS}
    />
  )
}
