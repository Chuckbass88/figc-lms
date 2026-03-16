'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, Check, CheckCheck, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/lib/types'

export default function NotificationsPanel({
  initialNotifications,
  userId,
}: {
  initialNotifications: Notification[]
  userId: string
}) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState(initialNotifications)
  const ref = useRef<HTMLDivElement>(null)

  const unread = notifications.filter(n => !n.read)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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

  // Realtime: ascolta nuove notifiche
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, payload => {
        setNotifications(prev => [payload.new as Notification, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Adesso'
    if (mins < 60) return `${mins} min fa`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h fa`
    return new Date(date).toLocaleDateString('it-IT')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
      >
        <Bell size={20} />
        {unread.length > 0 && (
          <span
            className="absolute top-1 right-1 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold"
            style={{ backgroundColor: '#C9A84C' }}
          >
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Notifiche</p>
              {unread.length > 0 && (
                <p className="text-xs text-gray-400">{unread.length} non {unread.length === 1 ? 'letta' : 'lette'}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread.length > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg hover:bg-gray-100 text-gray-500 transition"
                  title="Segna tutte come lette"
                >
                  <CheckCheck size={13} />
                  Tutte lette
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Lista notifiche */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                Nessuna notifica
              </div>
            )}
            {notifications.map(n => (
              <div
                key={n.id}
                className={`px-4 py-3 flex items-start gap-3 transition ${!n.read ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? 'bg-blue-500' : 'bg-transparent'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="flex-shrink-0 p-1 rounded-lg hover:bg-blue-100 text-blue-500 transition"
                    title="Segna come letta"
                  >
                    <Check size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
