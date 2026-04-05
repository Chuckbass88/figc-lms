import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/layout/DashboardShell'
import type { Profile, Notification } from '@/lib/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: notifications }, { data: participations }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', user.id),
  ])

  if (!profile) redirect('/login')

  // Calcola conversazioni con messaggi non letti
  let unreadMessagesCount = 0
  const convIds = (participations ?? []).map(p => p.conversation_id)
  if (convIds.length > 0) {
    const lastReadMap = new Map((participations ?? []).map(p => [p.conversation_id, p.last_read_at]))
    const { data: lastMsgs } = await supabase
      .from('messages')
      .select('conversation_id, created_at, sender_id')
      .in('conversation_id', convIds)
      .neq('sender_id', user.id)
      .order('created_at', { ascending: false })
    const seen = new Set<string>()
    for (const m of lastMsgs ?? []) {
      if (seen.has(m.conversation_id)) continue
      seen.add(m.conversation_id)
      const lastRead = lastReadMap.get(m.conversation_id)
      if (!lastRead || m.created_at > lastRead) unreadMessagesCount++
    }
  }

  return (
    <DashboardShell
      user={profile as Profile}
      notifications={(notifications ?? []) as Notification[]}
      unreadMessagesCount={unreadMessagesCount}
    >
      {children}
    </DashboardShell>
  )
}
