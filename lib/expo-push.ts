/**
 * Utility per inviare notifiche push Expo (mobile iOS/Android).
 * Da usare SOLO in API routes server-side.
 */
import { createAdminClient } from '@/lib/supabase/admin'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

interface ExpoPushMessage {
  to:       string
  title:    string
  body:     string
  data?:    Record<string, unknown>
  sound?:   'default' | null
  badge?:   number
  priority?: 'default' | 'normal' | 'high'
}

export async function sendExpoNotificationsToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string }
) {
  if (userIds.length === 0) return

  const admin = createAdminClient()

  // Prendi i token Expo degli utenti
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('expo_token')
    .in('user_id', userIds)
    .in('platform', ['ios', 'android'])
    .not('expo_token', 'is', null)

  const tokens = (subs ?? []).map(s => s.expo_token).filter(Boolean) as string[]
  if (tokens.length === 0) return

  const messages: ExpoPushMessage[] = tokens.map(token => ({
    to:       token,
    title:    payload.title,
    body:     payload.body,
    data:     { url: payload.url ?? '/messaggi' },
    sound:    'default',
    priority: 'high',
  }))

  // Invia in batch da 100
  const batches = []
  for (let i = 0; i < messages.length; i += 100) {
    batches.push(messages.slice(i, i + 100))
  }

  await Promise.allSettled(
    batches.map(batch =>
      fetch(EXPO_PUSH_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body:    JSON.stringify(batch),
      })
    )
  )
}
