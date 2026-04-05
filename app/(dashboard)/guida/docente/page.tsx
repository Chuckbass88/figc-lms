import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GuideClient from '@/components/guida/GuideClient'
import { DOCENTE_SECTIONS, DOCENTE_QUICK_ACTIONS } from '@/components/guida/guideDataDocente'

export default async function GuidaDocentePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  // Solo docente e super_admin
  if (profile?.role === 'studente') redirect('/guida/studente')

  return (
    <GuideClient
      role="docente"
      userName={profile?.full_name ?? 'Docente'}
      sections={DOCENTE_SECTIONS}
      quickActions={DOCENTE_QUICK_ACTIONS}
    />
  )
}
