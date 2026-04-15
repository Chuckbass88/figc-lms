'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Header from './Header'
import GuideFloatingPanel from '@/components/guida/GuideFloatingPanel'
import type { Profile, Notification } from '@/lib/types'

export default function DashboardShell({
  user,
  notifications,
  unreadMessagesCount = 0,
  children,
}: {
  user: Profile
  notifications: Notification[]
  unreadMessagesCount?: number
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Chiudi sidebar su cambio rotta (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-page-gradient">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — drawer su mobile, fissa su desktop */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto lg:flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar user={user} unreadCount={notifications.filter(n => !n.read).length} unreadMessagesCount={unreadMessagesCount} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Contenuto principale */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header
          user={user}
          notifications={notifications}
          onMenuClick={() => setSidebarOpen(v => !v)}
        />
        <main className={`flex-1 min-h-0 ${pathname.startsWith("/messaggi") ? "overflow-hidden" : "overflow-y-auto p-4 sm:p-7"}`}>
          {children}
        </main>
      </div>

      {/* Pannello guida flottante — visibile quando l'utente ha minimizzato la guida */}
      <GuideFloatingPanel role={user.role} userName={user.full_name ?? ''} />
    </div>
  )
}
