'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, BookOpen, Users, Bell, GraduationCap,
  Calendar, LogOut, ChevronRight, ChevronDown, UserCircle,
  MessageSquare, StickyNote, Archive, Search, Shield,
  BookMarked, CalendarRange,
} from 'lucide-react'
import type { UserRole, Profile } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

// ─── Tipi ────────────────────────────────────────────────────
interface NavLeaf {
  type: 'leaf'
  label: string
  href: string
  icon?: React.ReactNode
  badge?: 'notifications' | 'messages'
  disabled?: boolean
}

interface NavSection {
  type: 'section'
  label: string
  icon: React.ReactNode
  key: string
  items: NavLeaf[]
  disabled?: boolean
}

interface NavDivider {
  type: 'divider'
}

type NavNode = NavLeaf | NavSection | NavDivider

// ─── Configurazione navigazione per ruolo ────────────────────
const NAV: Record<UserRole, NavNode[]> = {
  super_admin: [
    { type: 'leaf', label: 'Dashboard', href: '/super-admin', icon: <LayoutDashboard size={17} /> },
    { type: 'divider' },
    { type: 'leaf', label: 'Corsi', href: '/super-admin/corsi', icon: <BookOpen size={17} /> },
    { type: 'leaf', label: 'Utenti', href: '/super-admin/utenti', icon: <Users size={17} /> },
    { type: 'leaf', label: 'Archivio Generale', href: '/super-admin/archivio-generale', icon: <Archive size={17} /> },
    { type: 'leaf', label: 'Calendari', href: '/super-admin/calendari', icon: <CalendarRange size={17} /> },
    { type: 'leaf', label: 'Cerca', href: '/super-admin/cerca', icon: <Search size={17} /> },
    { type: 'divider' },
    { type: 'leaf', label: 'Messaggi', href: '/messaggi', icon: <MessageSquare size={17} />, badge: 'messages' },
    { type: 'leaf', label: 'Notifiche', href: '/notifiche', icon: <Bell size={17} />, badge: 'notifications' },
    { type: 'leaf', label: 'Note', href: '/super-admin/note', icon: <StickyNote size={17} /> },
    { type: 'divider' },
    { type: 'leaf', label: 'Il mio profilo', href: '/profilo', icon: <UserCircle size={17} /> },
  ],

  admin: [
    { type: 'leaf', label: 'Dashboard', href: '/super-admin', icon: <LayoutDashboard size={17} /> },
    { type: 'divider' },
    { type: 'leaf', label: 'Corsi', href: '/super-admin/corsi', icon: <BookOpen size={17} /> },
    { type: 'leaf', label: 'Utenti', href: '/super-admin/utenti', icon: <Users size={17} /> },
    { type: 'leaf', label: 'Archivio Generale', href: '/super-admin/archivio-generale', icon: <Archive size={17} /> },
    { type: 'leaf', label: 'Calendari', href: '/super-admin/calendari', icon: <CalendarRange size={17} /> },
    { type: 'divider' },
    { type: 'leaf', label: 'Messaggi', href: '/messaggi', icon: <MessageSquare size={17} />, badge: 'messages' },
    { type: 'leaf', label: 'Notifiche', href: '/notifiche', icon: <Bell size={17} />, badge: 'notifications' },
    { type: 'leaf', label: 'Note', href: '/super-admin/note', icon: <StickyNote size={17} /> },
    { type: 'divider' },
    { type: 'leaf', label: 'Il mio profilo', href: '/profilo', icon: <UserCircle size={17} /> },
  ],

  docente: [
    { type: 'leaf', label: 'Dashboard', href: '/docente', icon: <LayoutDashboard size={17} /> },
    { type: 'divider' },
    { type: 'leaf', label: 'I miei corsi', href: '/docente/corsi', icon: <BookOpen size={17} /> },
    { type: 'leaf', label: 'I miei corsisti', href: '/docente/corsisti', icon: <GraduationCap size={17} /> },
    {
      type: 'section', label: 'Libreria', icon: <BookMarked size={17} />, key: 'doc_libreria',
      items: [
        { type: 'leaf', label: 'Archivio Doc & Slides', href: '/docente/archivio' },
        { type: 'leaf', label: 'Banca Domande', href: '/docente/domande' },
        { type: 'leaf', label: 'Esami e Prove Int.', href: '/docente/libreria-quiz' },
      ],
    },
    { type: 'leaf', label: 'Calendario', href: '/docente/calendario', icon: <Calendar size={17} /> },
    { type: 'divider' },
    { type: 'leaf', label: 'Messaggi', href: '/messaggi', icon: <MessageSquare size={17} />, badge: 'messages' },
    { type: 'leaf', label: 'Notifiche', href: '/notifiche', icon: <Bell size={17} />, badge: 'notifications' },
    { type: 'leaf', label: 'Note', href: '/docente/note', icon: <StickyNote size={17} /> },
    { type: 'divider' },
    { type: 'leaf', label: 'Il mio profilo', href: '/profilo', icon: <UserCircle size={17} /> },
  ],

  studente: [
    { type: 'leaf', label: 'Dashboard', href: '/studente', icon: <LayoutDashboard size={17} /> },
    { type: 'divider' },
    { type: 'leaf', label: 'I miei corsi', href: '/studente/corsi', icon: <BookOpen size={17} /> },
    { type: 'leaf', label: 'Calendario', href: '/studente/calendario', icon: <Calendar size={17} /> },
    { type: 'divider' },
    { type: 'leaf', label: 'Messaggi', href: '/messaggi', icon: <MessageSquare size={17} />, badge: 'messages' },
    { type: 'leaf', label: 'Notifiche', href: '/notifiche', icon: <Bell size={17} />, badge: 'notifications' },
    { type: 'divider' },
    { type: 'leaf', label: 'Il mio profilo', href: '/profilo', icon: <UserCircle size={17} /> },
  ],
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  docente: 'Docente',
  studente: 'Corsista',
}

// ─── Componente SidebarLeaf ───────────────────────────────────
function SidebarLeaf({
  item, pathname, onClose, unreadCount, unreadMessagesCount,
}: {
  item: NavLeaf
  pathname: string
  onClose?: () => void
  unreadCount: number
  unreadMessagesCount: number
}) {
  const hrefBase = item.href.split('?')[0]
  const isDeep = hrefBase.split('/').length > 2
  const isActive =
    pathname === hrefBase ||
    (isDeep && pathname.startsWith(hrefBase + '/')) ||
    (item.href === '/messaggi' && pathname.startsWith('/messaggi/'))

  if (item.disabled) {
    return (
      <div
        title="Permesso non attivo"
        className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium opacity-35 cursor-not-allowed select-none"
        style={{ color: 'rgba(255,255,255,0.72)' }}
      >
        {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
        <span className="flex-1">{item.label}</span>
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
        isActive ? '' : 'hover:bg-white/10'
      }`}
      style={isActive
        ? { background: 'rgba(255,255,255,0.15)', color: 'white' }
        : { color: 'rgba(255,255,255,0.72)' }}
    >
      {item.icon && (
        <span className="flex-shrink-0" style={{ color: isActive ? 'white' : 'rgba(255,255,255,0.55)' }}>
          {item.icon}
        </span>
      )}
      <span className="flex-1">{item.label}</span>
      {item.badge === 'notifications' && unreadCount > 0 && (
        <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full text-xs font-bold flex items-center justify-center px-1"
          style={{ backgroundColor: '#0891B2', color: 'white' }}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
      {item.badge === 'messages' && unreadMessagesCount > 0 && (
        <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full text-xs font-bold flex items-center justify-center px-1"
          style={{ backgroundColor: '#0891B2', color: 'white' }}>
          {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
        </span>
      )}
      {isActive && <ChevronRight size={13} className="flex-shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }} />}
    </Link>
  )
}

// ─── Componente SidebarSection ────────────────────────────────
function SidebarSection({
  section, pathname, onClose, unreadCount, unreadMessagesCount,
}: {
  section: NavSection
  pathname: string
  onClose?: () => void
  unreadCount: number
  unreadMessagesCount: number
}) {
  const storageKey = `sidebar_open_${section.key}`

  const getInitialOpen = () => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem(storageKey)
    return stored === null ? true : stored === 'true'
  }

  const [open, setOpen] = useState(getInitialOpen)

  const isAnyChildActive = section.items.some(item => {
    const hrefBase = item.href.split('?')[0]
    return pathname === hrefBase || pathname.startsWith(hrefBase + '/')
  })

  useEffect(() => {
    if (isAnyChildActive && !open) {
      setOpen(true)
      localStorage.setItem(storageKey, 'true')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnyChildActive, storageKey])

  const toggle = () => {
    const next = !open
    setOpen(next)
    localStorage.setItem(storageKey, String(next))
  }

  if (section.disabled) {
    return (
      <div className="opacity-35 cursor-not-allowed" title="Permesso non attivo">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium select-none"
          style={{ color: 'rgba(255,255,255,0.72)' }}>
          <span className="flex-shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }}>{section.icon}</span>
          <span className="flex-1">{section.label}</span>
          <ChevronDown size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-white/10"
        style={{ color: 'rgba(255,255,255,0.72)' }}
      >
        <span className="flex-shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }}>{section.icon}</span>
        <span className="flex-1 text-left">{section.label}</span>
        <span
          className="flex-shrink-0 transition-transform duration-200"
          style={{
            color: 'rgba(255,255,255,0.4)',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        >
          <ChevronDown size={13} />
        </span>
      </button>
      {open && (
        <div className="ml-4 mt-0.5 pl-3 space-y-0.5">
          {section.items.map(item => (
            <SidebarLeaf
              key={item.href}
              item={item}
              pathname={pathname}
              onClose={onClose}
              unreadCount={unreadCount}
              unreadMessagesCount={unreadMessagesCount}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Componente principale Sidebar ───────────────────────────
export default function Sidebar({
  user,
  unreadCount = 0,
  unreadMessagesCount = 0,
  onClose,
}: {
  user: Profile
  unreadCount?: number
  unreadMessagesCount?: number
  onClose?: () => void
}) {
  const pathname = usePathname()
  const nodes = NAV[user.role] ?? NAV['studente']
  const initials = user.full_name
    .split(' ')
    .map((n: string) => n.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <aside className="glass w-64 flex flex-col h-screen flex-shrink-0 shadow-xl">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b border-white/10">
        <div className="rounded-xl overflow-hidden bg-white px-3 py-2 flex items-center justify-center shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-coachlab.png"
            alt="CoachLab"
            className="w-full h-auto object-contain"
            style={{ display: 'block', backgroundColor: 'white' }}
          />
        </div>
      </div>

      {/* Navigazione */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {nodes.map((node, i) => {
          if (node.type === 'divider') {
            return (
              <div
                key={`divider-${i}`}
                className="my-2 border-t"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }}
              />
            )
          }
          if (node.type === 'section') {
            return (
              <SidebarSection
                key={node.key}
                section={node}
                pathname={pathname}
                onClose={onClose}
                unreadCount={unreadCount}
                unreadMessagesCount={unreadMessagesCount}
              />
            )
          }
          return (
            <SidebarLeaf
              key={node.href}
              item={node}
              pathname={pathname}
              onClose={onClose}
              unreadCount={unreadCount}
              unreadMessagesCount={unreadMessagesCount}
            />
          )
        })}
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 cursor-pointer hover:bg-white/10">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate leading-tight text-white">{user.full_name}</p>
            <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {ROLE_LABELS[user.role]}
            </p>
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
