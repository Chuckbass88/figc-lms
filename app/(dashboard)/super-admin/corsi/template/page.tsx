import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TemplateListClient from './TemplateListClient'

export default async function TemplateListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: templates } = await supabase.from('course_templates').select('*').order('nome')

  return <TemplateListClient templates={templates ?? []} aree={[]} />
}
