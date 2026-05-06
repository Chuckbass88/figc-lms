'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Users, Bell,
  GraduationCap, Calendar, LogOut, ChevronRight, UserCircle, BarChart2, Search, CalendarDays, ClipboardCheck, ClipboardList, MessageSquare, FolderOpen, HelpCircle, CalendarRange, StickyNote,
} from 'lucide-react'
import type { UserRole, Profile } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface NavItem { label: string; href: string; icon: React.ReactNode; divider?: boolean }

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  super_admin: [
    { label: 'Dashboard',         href: '/super-admin',            icon: <LayoutDashboard size={17} /> },
    { label: 'Gestione Corsi',    href: '/super-admin/corsi',      icon: <BookOpen size={17} /> },
    { label: 'Agenda Sessioni',   href: '/super-admin/sessioni',   icon: <CalendarDays size={17} /> },
    { label: 'Panoramica Task',   href: '/super-admin/task',       icon: <ClipboardCheck size={17} />, divider: true },
    { label: 'Libreria Quiz',     href: '/super-admin/libreria-quiz', icon: <ClipboardList size={17} /> },
    { label: 'Archivio Documenti',href: '/archivio',               icon: <FolderOpen size={17} /> },
    { label: 'Note',              href: '/super-admin/note',       icon: <StickyNote size={17} /> },
    { label: 'Calendario',        href: '/super-admin/calendario', icon: <Calendar size={17} /> },
    { label: 'Utenti',            href: '/super-admin/utenti',     icon: <Users size={17} />, divider: true },
    { label: 'Cerca',             href: '/super-admin/cerca',      icon: <Search size={17} /> },
    { label: 'Report Presenze',   href: '/super-admin/report',     icon: <BarChart2 size={17} />, divider: true },
    { label: 'Messaggi',          href: '/messaggi',               icon: <MessageSquare size={17} /> },
    { label: 'Notifiche',         href: '/notifiche',              icon: <Bell size={17} /> },
    { label: 'Guida',             href: '/guida',                  icon: <HelpCircle size={17} />, divider: true },
    { label: 'Il mio profilo',    href: '/profilo',                icon: <UserCircle size={17} /> },
  ],
  docente: [
    { label: 'Dashboard',         href: '/docente',                icon: <LayoutDashboard size={17} /> },
    { label: 'I Miei Corsi',      href: '/docente/corsi',          icon: <BookOpen size={17} /> },
    { label: 'Le Mie Task',       href: '/docente/task',           icon: <ClipboardCheck size={17} /> },
    { label: 'Libreria Quiz',     href: '/docente/libreria-quiz',  icon: <ClipboardList size={17} />, divider: true },
    { label: 'Archivio Documenti',href: '/archivio',               icon: <FolderOpen size={17} /> },
    { label: 'Note',              href: '/docente/note',           icon: <StickyNote size={17} /> },
    { label: 'Calendario',        href: '/docente/calendario',     icon: <Calendar size={17} /> },
    { label: 'Corsisti',          href: '/docente/corsisti',       icon: <GraduationCap size={17} /> },
    { label: 'Report Idoneità',   href: '/docente/report',         icon: <BarChart2 size={17} />, divider: true },
    { label: 'Messaggi',          href: '/messaggi',               icon: <MessageSquare size={17} /> },
    { label: 'Notifiche',         href: '/notifiche',              icon: <Bell size={17} /> },
    { label: 'Guida',             href: '/guida',                  icon: <HelpCircle size={17} />, divider: true },
    { label: 'Il mio profilo',    href: '/profilo',                icon: <UserCircle size={17} /> },
  ],
  studente: [
    { label: 'Dashboard',         href: '/studente',               icon: <LayoutDashboard size={17} /> },
    { label: 'I Miei Corsi',      href: '/studente/corsi',         icon: <BookOpen size={17} /> },
    { label: 'Le Mie Task',       href: '/studente/task',          icon: <ClipboardCheck size={17} /> },
    { label: 'I Miei Quiz',       href: '/studente/quiz',          icon: <ClipboardList size={17} /> },
    { label: 'Le mie presenze',   href: '/studente/presenze',      icon: <BarChart2 size={17} /> },
    { label: 'Calendario',        href: '/studente/calendario',    icon: <Calendar size={17} /> },
    { label: 'Messaggi',          href: '/messaggi',               icon: <MessageSquare size={17} /> },
    { label: 'Notifiche',         href: '/notifiche',              icon: <Bell size={17} /> },
    { label: 'Guida',             href: '/guida',                  icon: <HelpCircle size={17} />, divider: true },
    { label: 'Il mio profilo',    href: '/profilo',                icon: <UserCircle size={17} /> },
  ],
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  docente: 'Docente',
  studente: 'Corsista',
}

export default function Sidebar({ user, unreadCount = 0, unreadMessagesCount = 0, onClose }: { user: Profile; unreadCount?: number; unreadMessagesCount?: number; onClose?: () => void }) {
  const pathname = usePathname()
  const navItems = NAV_ITEMS[user.role]

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const initials = user.full_name.split(' ').map((n: string) => n.charAt(0)).slice(0, 2).join('').toUpperCase()

  return (
    <aside className="glass w-64 flex flex-col h-screen flex-shrink-0 shadow-xl">

      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b border-white/10">
        <div className="rounded-xl overflow-hidden bg-white px-3 py-2 flex items-center justify-center shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-coachlab.png" alt="CoachLab" className="w-full h-auto object-contain" style={{ display: 'block', backgroundColor: 'white' }} />
        </div>
      </div>

      {/* Navigazione */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {navItems.map(item => {
          const isDeep = item.href.split('/').length > 2
          const isActive = pathname === item.href || (isDeep && pathname.startsWith(item.href + '/')) || (item.href === '/messaggi' && pathname.startsWith('/messaggi/'))
          return (
            <div key={item.href}>
              {item.divider && <div className="my-2 border-t border-white/10" />}
              <Link
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive ? '' : 'hover:bg-white/10'
                }`}
                style={isActive
                  ? { background: 'rgba(255,255,255,0.15)', color: 'white' }
                  : { color: 'rgba(255,255,255,0.72)' }
                }
              >
                <span className={`flex-shrink-0 transition-colors`}
                  style={{ color: isActive ? 'white' : 'rgba(255,255,255,0.55)' }}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.href === '/notifiche' && unreadCount > 0 && (
                  <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full text-xs font-bold flex items-center justify-center px-1"
                    style={{ backgroundColor: '#0891B2', color: 'white' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                {item.href === '/messaggi' && unreadMessagesCount > 0 && (
                  <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full text-xs font-bold flex items-center justify-center px-1"
                    style={{ backgroundColor: '#0891B2', color: 'white' }}>
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                  </span>
                )}
                {isActive && <ChevronRight size={13} className="flex-shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }} />}
              </Link>
            </div>
          )
        })}
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 cursor-pointer hover:bg-white/10">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate leading-tight text-white">{user.full_name}</p>
            <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{ROLE_LABELS[user.role]}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Esci"
            className="p-1.5 rounded-lg transition flex-shrink-0 hover:text-white"
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
