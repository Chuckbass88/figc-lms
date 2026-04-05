/**
 * Utility server-side per inviare Web Push notifications.
 * Da usare SOLO in API routes / Server Actions (non in client components).
 */
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

if (
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY
) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@coachlab.it',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
}

export interface PushPayload {
  title: string
  body:  string
  url?:  string
  tag?:  string
}

/**
 * Invia una push notification a tutti i dispositivi Web di un utente.
 * Ignora silenziosamente i dispositivi che hanno rimosso la subscription.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const admin = createAdminClient()

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')
    .eq('user_id', userId)
    .eq('platform', 'web')

  if (!subs || subs.length === 0) return

  const payloadStr = JSON.stringify(payload)

  const results = await Promise.allSettled(
    subs.map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payloadStr,
          { urgency: 'high', TTL: 60 * 60 * 24 } // 24h TTL
        )
      } catch (err: unknown) {
        // 410 Gone = subscription scaduta, rimuovila
        if (typeof err === 'object' && err !== null && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    })
  )

  return results
}

/**
 * Invia push a più utenti contemporaneamente.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  await Promise.allSettled(userIds.map(uid => sendPushToUser(uid, payload)))
}
