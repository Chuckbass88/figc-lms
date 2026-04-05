'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, LogOut, UserCircle, Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import NotificationsPanel from '@/components/layout/NotificationsPanel'
import type { Profile, Notification } from '@/lib/types'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  docente: 'Docente',
  studente: 'Corsista',
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  docente: 'bg-blue-100 text-blue-700',
  studente: 'bg-green-100 text-green-700',
}

// Breadcrumb dal pathname
function getPageTitle(pathname: string): string {
  // ── Super Admin ──────────────────────────────────────────────
  if (pathname === '/super-admin') return 'Dashboard'
  // Corsi: sotto-sezioni specifiche (prima delle generiche)
  if (pathname.startsWith('/super-admin/corsi') && pathname.includes('/sessioni')) return 'Gestione Sessioni'
  if (pathname.startsWith('/super-admin/corsi') && pathname.includes('/gruppi')) return 'Gestione Gruppi'
  if (pathname.startsWith('/super-admin/corsi') && pathname.includes('/gestione')) return 'Gestione Partecipanti'
  if (pathname.startsWith('/super-admin/corsi') && pathname.includes('/modifica')) return 'Modifica Corso'
  if (pathname.startsWith('/super-admin/corsi') && pathname.includes('/presenze')) return 'Registro Presenze'
  if (pathname.startsWith('/super-admin/corsi') && pathname.includes('/annunci')) return 'Annunci del Corso'
  if (pathname.startsWith('/super-admin/corsi') && pathname.includes('/quiz') && pathname.includes('/domande')) return 'Modifica Domande Quiz'
  if (pathname.startsWith('/super-admin/corsi') && pathname.match(/\/quiz\/[^/]+/)) return 'Dettaglio Quiz'
  if (pathname.startsWith('/super-admin/corsi') && pathname.includes('/quiz')) return 'Quiz del Corso'
  if (pathname.startsWith('/super-admin/corsi') && pathname.match(/\/task\/[^/]+/)) return 'Dettaglio Task'
  if (pathname.startsWith('/super-admin/corsi') && pathname.includes('/task')) return 'Task del Corso'
  if (pathname.startsWith('/super-admin/corsi/nuovo')) return 'Nuovo Corso'
  if (pathname.match(/\/super-admin\/corsi\/[^/]+$/)) return 'Dettaglio Corso'
  if (pathname.startsWith('/super-admin/corsi')) return 'Gestione Corsi'
  // Utenti
  if (pathname.startsWith('/super-admin/utenti') && pathname.includes('/attestato')) return 'Attestato di Frequenza'
  if (pathname.match(/\/super-admin\/utenti\/[^/]+/)) return 'Dettaglio Utente'
  if (pathname.startsWith('/super-admin/utenti')) return 'Gestione Utenti'
  // Altre sezioni admin
  if (pathname.startsWith('/super-admin/sessioni')) return 'Agenda Sessioni'
  if (pathname.startsWith('/super-admin/task')) return 'Panoramica Task'
  if (pathname.startsWith('/super-admin/quiz')) return 'Panoramica Quiz'
  if (pathname.startsWith('/super-admin/domande')) return 'Archivio Domande'
  if (pathname.startsWith('/docente/domande')) return 'Mia Libreria Domande'
  if (pathname.startsWith('/super-admin/cerca')) return 'Cerca'
  if (pathname.startsWith('/super-admin/report')) return 'Report Presenze'
  if (pathname.startsWith('/super-admin/impostazioni')) return 'Invia Notifiche'

  // ── Docente ───────────────────────────────────────────────────
  if (pathname === '/docente') return 'Dashboard'
  if (pathname.startsWith('/docente/corsi') && pathname.includes('/presenze')) return 'Registro Presenze'
  if (pathname.startsWith('/docente/corsi') && pathname.includes('/annunci')) return 'Annunci del Corso'
  if (pathname.startsWith('/docente/corsi') && pathname.includes('/quiz') && pathname.includes('/domande')) return 'Modifica Domande Quiz'
  if (pathname.startsWith('/docente/corsi') && pathname.match(/\/quiz\/[^/]+/)) return 'Dettaglio Quiz'
  if (pathname.startsWith('/docente/corsi') && pathname.includes('/quiz')) return 'Quiz del Corso'
  if (pathname.startsWith('/docente/corsi') && pathname.match(/\/task\/[^/]+/)) return 'Dettaglio Task'
  if (pathname.startsWith('/docente/corsi') && pathname.includes('/task')) return 'Task del Corso'
  if (pathname.match(/\/docente\/corsi\/[^/]+$/)) return 'Dettaglio Corso'
  if (pathname.startsWith('/docente/corsi')) return 'I Miei Corsi'
  if (pathname.match(/\/docente\/corsisti\/[^/]+/)) return 'Dettaglio Corsista'
  if (pathname.startsWith('/docente/corsisti')) return 'Corsisti'
  if (pathname.startsWith('/docente/task')) return 'Le Mie Task'
  if (pathname.startsWith('/docente/quiz')) return 'I Miei Quiz'
  if (pathname.startsWith('/docente/calendario')) return 'Calendario'
  if (pathname.startsWith('/docente/report')) return 'Report Idoneità'
  if (pathname.startsWith('/docente/notifiche')) return 'Invia Notifica'

  // ── Studente ──────────────────────────────────────────────────
  if (pathname === '/studente') return 'Dashboard'
  if (pathname.startsWith('/studente/corsi') && pathname.includes('/presenze')) return 'Le mie presenze'
  if (pathname.startsWith('/studente/corsi') && pathname.includes('/attestato')) return 'Attestato di Frequenza'
  if (pathname.startsWith('/studente/corsi') && pathname.match(/\/quiz\/[^/]+/)) return 'Dettaglio Quiz'
  if (pathname.startsWith('/studente/corsi') && pathname.includes('/quiz')) return 'Quiz del Corso'
  if (pathname.startsWith('/studente/corsi') && pathname.match(/\/task\/[^/]+/)) return 'Dettaglio Task'
  if (pathname.startsWith('/studente/corsi') && pathname.includes('/task')) return 'Task del Corso'
  if (pathname.startsWith('/studente/corsi') && pathname.includes('/annunci')) return 'Annunci del Corso'
  if (pathname.match(/\/studente\/corsi\/[^/]+$/)) return 'Dettaglio Corso'
  if (pathname.startsWith('/studente/corsi')) return 'I Miei Corsi'
  if (pathname.startsWith('/studente/task')) return 'Le Mie Task'
  if (pathname.startsWith('/studente/quiz')) return 'I Miei Quiz'
  if (pathname.startsWith('/studente/presenze')) return 'Le mie presenze'
  if (pathname.startsWith('/studente/calendario')) return 'Calendario'

  // ── Comuni ────────────────────────────────────────────────────
  if (pathname.startsWith('/notifiche')) return 'Le mie notifiche'
  if (pathname.startsWith('/profilo')) return 'Il mio profilo'
  if (pathname.startsWith('/invito')) return 'Invito al Corso'
  if (pathname.match(/\/messaggi\/[^/]+/)) return 'Conversazione'
  if (pathname.startsWith('/messaggi')) return 'Messaggi'
  return 'Dashboard'
}

export default function Header({ user, notifications, onMenuClick }: { user: Profile; notifications: Notification[]; onMenuClick?: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const pageTitle = getPageTitle(pathname)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const initials = user.full_name.split(' ').map((n: string) => n.charAt(0)).slice(0, 2).join('').toUpperCase()

  return (
    <header className="glass-header px-6 h-14 flex items-center flex-shrink-0">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          {/* Hamburger mobile */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl transition hover:bg-white/60"
            style={{ color: '#64748B' }}
          >
            <Menu size={20} />
          </button>
          {/* Titolo pagina */}
          <h1 className="text-base font-bold tracking-tight" style={{ color: '#0F172A' }}>{pageTitle}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Notifiche */}
          <NotificationsPanel initialNotifications={notifications} userId={user.id} />

          {/* Menu utente */}
          <div className="relative" ref={ref}>
            <button
              onClick={() => setOpen(v => !v)}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl transition hover:bg-white/70"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                style={{ background: 'linear-gradient(135deg, #1B3768 0%, #0891B2 100%)' }}
              >
                {initials}
              </div>
              <span className="hidden sm:block text-sm font-medium leading-none" style={{ color: '#1B3768' }}>
                {user.full_name.split(' ')[0]}
              </span>
              <ChevronDown size={13} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} style={{ color: '#94A3B8' }} />
            </button>

            {open && (
              <div className="absolute right-0 mt-1.5 w-52 rounded-xl shadow-xl z-50 overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.9)' }}>
                {/* Info utente */}
                <div className="px-4 py-3 border-b border-white/60">
                  <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{user.full_name}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: '#94A3B8' }}>{user.email}</p>
                  <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role]}`}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>
                <div className="p-1.5 space-y-0.5">
                  <Link
                    href="/profilo"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition hover:bg-[rgba(8,145,178,0.06)]"
                    style={{ color: '#475569' }}
                  >
                    <UserCircle size={15} style={{ color: '#94A3B8' }} />
                    Il mio profilo
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition font-medium"
                  >
                    <LogOut size={15} />
                    Esci dall&apos;account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
