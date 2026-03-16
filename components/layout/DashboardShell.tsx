'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Header from './Header'
import type { Profile, Notification } from '@/lib/types'

export default function DashboardShell({
  user,
  notifications,
  children,
}: {
  user: Profile
  notifications: Notification[]
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Chiudi sidebar su cambio rotta (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F3F5F9' }}>
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
        <Sidebar user={user} unreadCount={notifications.filter(n => !n.read).length} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Contenuto principale */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header
          user={user}
          notifications={notifications}
          onMenuClick={() => setSidebarOpen(v => !v)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-7">
          {children}
        </main>
      </div>
    </div>
  )
}
