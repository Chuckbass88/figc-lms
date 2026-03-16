'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Users, Bell,
  GraduationCap, Calendar, LogOut, ChevronRight, UserCircle, BarChart2, Send, Search, CalendarDays, ClipboardCheck, ClipboardList,
} from 'lucide-react'
import type { UserRole, Profile } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface NavItem { label: string; href: string; icon: React.ReactNode }

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  super_admin: [
    { label: 'Dashboard', href: '/super-admin', icon: <LayoutDashboard size={17} /> },
    { label: 'Gestione Corsi', href: '/super-admin/corsi', icon: <BookOpen size={17} /> },
    { label: 'Agenda Sessioni', href: '/super-admin/sessioni', icon: <CalendarDays size={17} /> },
    { label: 'Panoramica Task', href: '/super-admin/task', icon: <ClipboardCheck size={17} /> },
    { label: 'Panoramica Quiz', href: '/super-admin/quiz', icon: <ClipboardCheck size={17} /> },
    { label: 'Utenti', href: '/super-admin/utenti', icon: <Users size={17} /> },
    { label: 'Cerca', href: '/super-admin/cerca', icon: <Search size={17} /> },
    { label: 'Report Presenze', href: '/super-admin/report', icon: <BarChart2 size={17} /> },
    { label: 'Invia Notifiche', href: '/super-admin/impostazioni', icon: <Bell size={17} /> },
    { label: 'Le mie notifiche', href: '/notifiche', icon: <Send size={17} /> },
    { label: 'Il mio profilo', href: '/profilo', icon: <UserCircle size={17} /> },
  ],
  docente: [
    { label: 'Dashboard', href: '/docente', icon: <LayoutDashboard size={17} /> },
    { label: 'I Miei Corsi', href: '/docente/corsi', icon: <BookOpen size={17} /> },
    { label: 'I Miei Task', href: '/docente/task', icon: <ClipboardCheck size={17} /> },
    { label: 'I Miei Quiz', href: '/docente/quiz', icon: <ClipboardList size={17} /> },
    { label: 'Calendario', href: '/docente/calendario', icon: <Calendar size={17} /> },
    { label: 'Corsisti', href: '/docente/corsisti', icon: <GraduationCap size={17} /> },
    { label: 'Invia Notifica', href: '/docente/notifiche', icon: <Send size={17} /> },
    { label: 'Le mie notifiche', href: '/notifiche', icon: <Bell size={17} /> },
    { label: 'Il mio profilo', href: '/profilo', icon: <UserCircle size={17} /> },
  ],
  studente: [
    { label: 'Dashboard', href: '/studente', icon: <LayoutDashboard size={17} /> },
    { label: 'I Miei Corsi', href: '/studente/corsi', icon: <BookOpen size={17} /> },
    { label: 'I Miei Task', href: '/studente/task', icon: <ClipboardList size={17} /> },
    { label: 'I Miei Quiz', href: '/studente/quiz', icon: <ClipboardCheck size={17} /> },
    { label: 'Le mie presenze', href: '/studente/presenze', icon: <BarChart2 size={17} /> },
    { label: 'Calendario', href: '/studente/calendario', icon: <Calendar size={17} /> },
    { label: 'Le mie notifiche', href: '/notifiche', icon: <Bell size={17} /> },
    { label: 'Il mio profilo', href: '/profilo', icon: <UserCircle size={17} /> },
  ],
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  docente: 'Docente',
  studente: 'Corsista',
}

export default function Sidebar({ user, unreadCount = 0, onClose }: { user: Profile; unreadCount?: number; onClose?: () => void }) {
  const pathname = usePathname()
  const navItems = NAV_ITEMS[user.role]

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const initials = user.full_name.split(' ').map((n: string) => n.charAt(0)).slice(0, 2).join('').toUpperCase()

  return (
    <aside className="w-60 flex flex-col h-screen flex-shrink-0" style={{ background: 'linear-gradient(180deg, #001233 0%, #003DA5 100%)' }}>

      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md"
            style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #E8C96A 100%)' }}>
            <span className="font-black text-xs tracking-tight" style={{ color: '#001233' }}>FIGC</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight tracking-wide">FIGC LMS</p>
            <p className="text-blue-300 text-xs font-medium">Formazione Allenatori</p>
          </div>
        </div>
      </div>

      {/* Separatore */}
      <div className="mx-4 border-t border-white/10 mb-4" />

      {/* Navigazione */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/profilo' && item.href.length > 1 && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-blue-700' : 'text-blue-300 group-hover:text-white'}`}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.href === '/notifiche' && unreadCount > 0 && (
                <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full text-xs font-bold flex items-center justify-center px-1"
                  style={{ backgroundColor: '#C9A84C', color: '#001233' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              {isActive && <ChevronRight size={13} className="text-blue-600 flex-shrink-0" />}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="mx-3 mb-4 mt-3">
        <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 text-white shadow-sm"
            style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C96A)' }}>
            <span style={{ color: '#001233' }}>{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-semibold truncate leading-tight">{user.full_name}</p>
            <p className="text-blue-300 text-xs truncate mt-0.5">{ROLE_LABELS[user.role]}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Esci"
            className="p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-white/15 transition flex-shrink-0"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
