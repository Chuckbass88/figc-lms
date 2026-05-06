import { createClient } from '@/lib/supabase/server'
import { StickyNote } from 'lucide-react'
import NotePageClient from '@/components/note/NotePageClient'

export default async function NotePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: notes }, { data: docenti }, { data: admins }] = await Promise.all([
    supabase
      .from('notes')
      .select('*, creator:profiles!created_by(id, full_name), shares:note_shares(id, shared_with, can_edit, shared_at, user:profiles!shared_with(id, full_name, email))')
      .order('updated_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, email').eq('role', 'docente').eq('is_active', true).order('full_name'),
    supabase.from('profiles').select('id, full_name, email').eq('role', 'super_admin').eq('is_active', true).order('full_name'),
  ])

  const allPeople = [...(docenti ?? []), ...(admins ?? [])]

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <StickyNote size={22} className="text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Note</h2>
        </div>
        <p className="text-gray-500 text-sm">Spazio per idee, appunti e progetti. Condivisibile con docenti e altri admin.</p>
      </div>

      <NotePageClient
        initialNotes={(notes ?? []) as never}
        currentUserId={user.id}
        allDocenti={allPeople}
        role="super_admin"
      />
    </div>
  )
}
