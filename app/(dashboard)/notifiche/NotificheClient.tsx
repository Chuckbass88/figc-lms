'use client'

import { useState } from 'react'
import { Bell, Check, CheckCheck, Circle } from 'lucide-react'

interface Notification {
  id: string
  title: string
  message: string
  read: boolean
  created_at: string
}

export default function NotificheClient({ initialNotifications, userId }: {
  initialNotifications: Notification[]
  userId: string
}) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const unreadCount = notifications.filter(n => !n.read).length

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Adesso'
    if (mins < 60) return `${mins} min fa`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h fa`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} giorni fa`
    return new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  async function markRead(id: string) {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'all' }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  // Raggruppa per data
  const grouped: Record<string, Notification[]> = {}
  for (const n of notifications) {
    const date = new Date(n.created_at)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    let label: string
    if (date.toDateString() === today.toDateString()) label = 'Oggi'
    else if (date.toDateString() === yesterday.toDateString()) label = 'Ieri'
    else label = date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

    if (!grouped[label]) grouped[label] = []
    grouped[label].push(n)
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
        <Bell size={36} className="text-gray-200 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Nessuna notifica ricevuta.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Azioni */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            <span className="font-semibold text-gray-800">{unreadCount}</span> non {unreadCount === 1 ? 'letta' : 'lette'}
          </span>
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 border border-gray-200 transition font-medium"
          >
            <CheckCheck size={13} /> Segna tutte come lette
          </button>
        </div>
      )}

      {/* Lista raggruppata */}
      {Object.entries(grouped).map(([label, items]) => (
        <div key={label}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">{label}</p>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-50">
            {items.map(n => (
              <div
                key={n.id}
                className={`flex items-start gap-4 px-5 py-4 transition ${!n.read ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`}
              >
                <div className="flex-shrink-0 mt-1">
                  {n.read
                    ? <Circle size={8} className="text-gray-300 mt-0.5" fill="currentColor" />
                    : <Circle size={8} className="text-blue-500 mt-0.5" fill="currentColor" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {n.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5 leading-snug">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1.5">{timeAgo(n.created_at)}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-blue-100 text-blue-500 transition"
                    title="Segna come letta"
                  >
                    <Check size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
