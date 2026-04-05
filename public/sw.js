// CoachLab — Service Worker per Web Push Notifications

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// ── Push ricevuto ─────────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = {}
  try { data = event.data?.json() ?? {} } catch { data = { title: 'Nuovo messaggio', body: event.data?.text() ?? '' } }

  const title   = data.title   ?? 'CoachLab'
  const options = {
    body:    data.body    ?? '',
    icon:    '/logo-coachlab.png',
    badge:   '/logo-coachlab.png',
    tag:     data.tag     ?? 'coachlab-msg',
    renotify: true,
    data:    { url: data.url ?? '/messaggi' },
    actions: [
      { action: 'open',    title: 'Apri' },
      { action: 'dismiss', title: 'Ignora' },
    ],
    vibrate: [200, 100, 200],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ── Click sulla notifica ──────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const url = event.notification.data?.url ?? '/messaggi'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Se c'è già una finestra aperta, focussala e naviga
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          client.postMessage({ type: 'navigate', url })
          return
        }
      }
      // Altrimenti apri una nuova finestra
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
