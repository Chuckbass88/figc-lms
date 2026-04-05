'use client'

/**
 * Pulsante per abilitare/disabilitare le notifiche push Web.
 * Da inserire nelle impostazioni profilo o nella shell messaggi.
 */

import { useState, useEffect } from 'react'
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const arr     = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr.buffer as ArrayBuffer
}

type Status = 'idle' | 'loading' | 'subscribed' | 'denied' | 'unsupported'

export default function PushNotifButton({ className = '' }: { className?: string }) {
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported'); return
    }
    if (Notification.permission === 'denied') { setStatus('denied'); return }

    // Registra SW e controlla se già sottoscritto
    navigator.serviceWorker.register('/sw.js').then(async reg => {
      const existing = await reg.pushManager.getSubscription()
      if (existing) setStatus('subscribed')
    }).catch(() => setStatus('unsupported'))
  }, [])

  // Naviga a URL da Service Worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data?.type === 'navigate') window.location.href = e.data.url
    })
  }, [])

  async function handleSubscribe() {
    setStatus('loading')
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setStatus('denied'); return }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const subJson = sub.toJSON()
      const res = await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          endpoint: subJson.endpoint,
          keys:     subJson.keys,
        }),
      })
      setStatus(res.ok ? 'subscribed' : 'idle')
    } catch {
      setStatus('idle')
    }
  }

  async function handleUnsubscribe() {
    setStatus('loading')
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method:  'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setStatus('idle')
    } catch {
      setStatus('idle')
    }
  }

  if (status === 'unsupported') return null

  if (status === 'loading') return (
    <div className={`flex items-center gap-2 text-xs text-gray-400 ${className}`}>
      <Loader2 size={13} className="animate-spin" />
      <span>Attivazione...</span>
    </div>
  )

  if (status === 'denied') return (
    <div className={`flex items-center gap-2 text-xs text-red-400 ${className}`}>
      <BellOff size={13} />
      <span>Notifiche bloccate dal browser</span>
    </div>
  )

  if (status === 'subscribed') return (
    <button
      onClick={handleUnsubscribe}
      className={`flex items-center gap-2 text-xs text-green-600 hover:text-red-500 transition-colors group ${className}`}
      title="Clicca per disattivare"
    >
      <BellRing size={13} />
      <span className="group-hover:hidden">Notifiche attive</span>
      <span className="hidden group-hover:inline">Disattiva notifiche</span>
    </button>
  )

  return (
    <button
      onClick={handleSubscribe}
      className={`flex items-center gap-2 text-xs text-gray-500 hover:text-blue-600 transition-colors ${className}`}
      title="Attiva notifiche push"
    >
      <Bell size={13} />
      <span>Attiva notifiche</span>
    </button>
  )
}
