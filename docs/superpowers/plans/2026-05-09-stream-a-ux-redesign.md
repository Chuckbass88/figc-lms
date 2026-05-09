# Stream A — UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire la sidebar flat con una navigazione Notion-style collassabile per tutti i ruoli (super_admin, admin, docente, studente) e aggiornare le dashboard con widget esplicativi e lista corsi compatta.

**Architecture:** Refactor di `components/layout/Sidebar.tsx` per supportare sezioni collassabili con `localStorage` persistence. Il file `DashboardShell.tsx` rimane invariato. Le dashboard per ruolo vengono aggiornate separatamente. Il nuovo ruolo `admin` usa la stessa struttura sidebar del super_admin con voci grayed-out in base ai permessi.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, Lucide React, TypeScript. Worktree: `feature/ux-redesign`.

**Prerequisiti:** Prima di iniziare, assicurarsi che Stream B abbia già eseguito la migration per il ruolo `admin` in `lib/types.ts`. Se non ancora disponibile, aggiungere `'admin'` alla union temporaneamente e rimuovere il TODO al merge.

---

## File Map

| File | Azione | Responsabilità |
|---|---|---|
| `components/layout/Sidebar.tsx` | **Sostituire completamente** | Sidebar Notion-style collassabile, tutti i ruoli |
| `lib/types.ts` | **Modificare** | Aggiungere `'admin'` a `UserRole` |
| `app/(dashboard)/super-admin/page.tsx` | **Modificare** | Dashboard SA: widget + lista corsi compatta |
| `app/(dashboard)/docente/page.tsx` | **Modificare** | Dashboard docente: testo esplicativo widget |
| `app/(dashboard)/studente/page.tsx` | **Modificare** | Dashboard studente: widget prossima sessione + % presenze |

---

## Task 1: Aggiungere ruolo `admin` ai tipi TypeScript

**Files:**
- Modify: `lib/types.ts:1`

- [ ] **Step 1: Aggiornare UserRole**

```typescript
// lib/types.ts — riga 1
export type UserRole = 'super_admin' | 'admin' | 'docente' | 'studente'
```

- [ ] **Step 2: Verificare che non ci siano errori TypeScript**

```bash
cd ~/figc-lms && npx tsc --noEmit 2>&1 | head -30
```

Expected: nessun errore relativo a `UserRole`. Eventuali errori su `switch(role)` exhaustive check vanno corretti aggiungendo il case `'admin'`.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add admin role to UserRole type"
```

---

## Task 2: Sidebar Notion-style — Struttura collassabile

**Files:**
- Modify: `components/layout/Sidebar.tsx` (156 righe → ~280 righe)

La sidebar attuale usa un array piatto `NAV_ITEMS`. La sostituiamo con sezioni collassabili che mantengono lo stato in `localStorage`. Il design glassmorphism (`glass` class) rimane invariato.

- [ ] **Step 1: Sostituire completamente `components/layout/Sidebar.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, BookOpen, Users, Bell, GraduationCap,
  Calendar, LogOut, ChevronRight, ChevronDown, UserCircle,
  BarChart2, Search, MessageSquare, FolderOpen, HelpCircle,
  StickyNote, FileText, Shield, ClipboardCheck, ClipboardList,
  BookMarked, Archive, CalendarRange,
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
  key: string          // chiave localStorage per stato collasso
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
    {
      type: 'section', label: 'Corsi', icon: <BookOpen size={17} />, key: 'sa_corsi',
      items: [
        { type: 'leaf', label: 'Tutti i corsi', href: '/super-admin/corsi' },
        { type: 'leaf', label: 'Crea nuovo corso', href: '/super-admin/corsi/nuovo' },
        { type: 'leaf', label: 'Template corsi', href: '/super-admin/corsi/template' },
      ],
    },
    {
      type: 'section', label: 'Utenti', icon: <Users size={17} />, key: 'sa_utenti',
      items: [
        { type: 'leaf', label: 'Corsisti', href: '/super-admin/utenti?ruolo=studente' },
        { type: 'leaf', label: 'Docenti', href: '/super-admin/utenti?ruolo=docente' },
        { type: 'leaf', label: 'Admin', href: '/super-admin/utenti?ruolo=admin' },
        { type: 'leaf', label: 'Importa utenti', href: '/super-admin/utenti/importa' },
      ],
    },
    {
      type: 'section', label: 'Archivio Generale', icon: <Archive size={17} />, key: 'sa_archivio',
      items: [
        { type: 'leaf', label: 'Documenti e Slides', href: '/super-admin/archivio-generale' },
      ],
    },
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
    { type: 'leaf', label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={17} /> },
    { type: 'divider' },
    {
      type: 'section', label: 'Corsi', icon: <BookOpen size={17} />, key: 'adm_corsi',
      items: [
        { type: 'leaf', label: 'Tutti i corsi', href: '/admin/corsi' },
        { type: 'leaf', label: 'Crea nuovo corso', href: '/admin/corsi/nuovo' },
        { type: 'leaf', label: 'Template corsi', href: '/admin/corsi/template' },
      ],
    },
    {
      type: 'section', label: 'Utenti', icon: <Users size={17} />, key: 'adm_utenti',
      items: [
        { type: 'leaf', label: 'Corsisti', href: '/admin/utenti?ruolo=studente' },
        { type: 'leaf', label: 'Docenti', href: '/admin/utenti?ruolo=docente' },
      ],
    },
    {
      type: 'section', label: 'Archivio Generale', icon: <Archive size={17} />, key: 'adm_archivio',
      items: [
        { type: 'leaf', label: 'Documenti e Slides', href: '/admin/archivio-generale' },
      ],
    },
    { type: 'leaf', label: 'Calendari', href: '/admin/calendari', icon: <CalendarRange size={17} /> },
    { type: 'divider' },
    { type: 'leaf', label: 'Messaggi', href: '/messaggi', icon: <MessageSquare size={17} />, badge: 'messages' },
    { type: 'leaf', label: 'Notifiche', href: '/notifiche', icon: <Bell size={17} />, badge: 'notifications' },
    { type: 'leaf', label: 'Note', href: '/admin/note', icon: <StickyNote size={17} /> },
    { type: 'divider' },
    { type: 'leaf', label: 'Il mio profilo', href: '/profilo', icon: <UserCircle size={17} /> },
  ],

  docente: [
    { type: 'leaf', label: 'Dashboard', href: '/docente', icon: <LayoutDashboard size={17} /> },
    { type: 'divider' },
    {
      type: 'section', label: 'I miei corsi', icon: <BookOpen size={17} />, key: 'doc_corsi',
      items: [
        { type: 'leaf', label: 'Tutti i corsi', href: '/docente/corsi' },
      ],
    },
    {
      type: 'section', label: 'Libreria', icon: <BookMarked size={17} />, key: 'doc_libreria',
      items: [
        { type: 'leaf', label: 'Archivio Doc & Slides', href: '/docente/archivio' },
        { type: 'leaf', label: 'Banca Domande', href: '/docente/domande' },
        { type: 'leaf', label: 'Esami e Prove Int.', href: '/docente/libreria-quiz' },
      ],
    },
    { type: 'leaf', label: 'Corsisti', href: '/docente/corsisti', icon: <GraduationCap size={17} /> },
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
    {
      type: 'section', label: 'I miei corsi', icon: <BookOpen size={17} />, key: 'stu_corsi',
      items: [
        { type: 'leaf', label: 'Tutti i corsi', href: '/studente/corsi' },
      ],
    },
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

// ─── Componenti interni ───────────────────────────────────────
function SidebarLeaf({
  item, pathname, onClose, unreadCount, unreadMessagesCount,
}: {
  item: NavLeaf
  pathname: string
  onClose?: () => void
  unreadCount: number
  unreadMessagesCount: number
}) {
  const isDeep = item.href.split('/').length > 2
  const isActive =
    pathname === item.href ||
    (isDeep && pathname.startsWith(item.href.split('?')[0] + '/')) ||
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
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem(storageKey)
    return stored === null ? true : stored === 'true'
  })

  const isAnyChildActive = section.items.some(item =>
    pathname === item.href ||
    pathname.startsWith(item.href.split('?')[0] + '/')
  )

  // Auto-apri se un figlio è attivo
  useEffect(() => {
    if (isAnyChildActive && !open) {
      setOpen(true)
      localStorage.setItem(storageKey, 'true')
    }
  }, [isAnyChildActive]) // eslint-disable-line react-hooks/exhaustive-deps

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
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-white/10 ${
          isAnyChildActive && !open ? 'bg-white/5' : ''
        }`}
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
        <div className="ml-4 mt-0.5 pl-3 border-l space-y-0.5" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
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

// ─── Componente principale ────────────────────────────────────
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
  const nodes = NAV[user.role]
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
            return <div key={i} className="my-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
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
```

- [ ] **Step 2: Verificare compilazione TypeScript**

```bash
cd ~/figc-lms && npx tsc --noEmit 2>&1 | head -20
```

Expected: nessun errore. Se appaiono errori su `UserRole` o `Profile`, verificare che `lib/types.ts` abbia già `'admin'` nella union.

- [ ] **Step 3: Avviare dev server e verificare visivamente**

```bash
cd ~/figc-lms && npm run dev
```

Aprire `http://localhost:3001` come super_admin (`admin@figclms.it` / `Figc2024!`). Verificare:
- Logo CoachLab visibile in cima
- Sezioni "Corsi", "Utenti", "Archivio Generale" collassabili con freccia
- Stato aperto/chiuso persiste dopo refresh pagina
- Voce attiva evidenziata in navy
- Badge messaggi e notifiche presenti
- Logout funziona

- [ ] **Step 4: Verificare sidebar docente**

Login come `alessandronista@libero.it` / `Figc2024!`. Verificare:
- Sezioni "I miei corsi" e "Libreria" collassabili
- "Archivio Doc & Slides" presente in Libreria
- "Esami e Prove Int." presente in Libreria (in fondo)
- Calendario presente come leaf

- [ ] **Step 5: Verificare sidebar studente**

Login come `marco.verdi.test2026@yopmail.com` / `TestCoach2026!`. Verificare:
- "I miei corsi" collassabile
- Nessuna sezione Libreria
- Calendario presente

- [ ] **Step 6: Commit**

```bash
git add components/layout/Sidebar.tsx lib/types.ts
git commit -m "feat: sidebar Notion-style collassabile per tutti i ruoli"
```

---

## Task 3: Dashboard Super Admin — Lista corsi compatta + widget

**Files:**
- Modify: `app/(dashboard)/super-admin/page.tsx`

- [ ] **Step 1: Leggere il file corrente per capire la struttura**

```bash
cat ~/figc-lms/app/\(dashboard\)/super-admin/page.tsx
```

- [ ] **Step 2: Aggiungere query corsi con regione, tipo e CU alla funzione server**

Nella `page.tsx` del super-admin (componente server), aggiungere alla query Supabase:

```typescript
// Aggiungere alla sezione delle query parallele esistenti
const { data: corsiAttivi } = await supabase
  .from('courses')
  .select(`
    id, name, status, regione, tipo_corso, cu_number, cu_url,
    course_enrollments(count),
    course_instructors(profiles(full_name))
  `)
  .eq('status', 'active')
  .order('name', { ascending: true })
```

- [ ] **Step 3: Creare componente `CorsiAttiviTable`**

Creare `app/(dashboard)/super-admin/CorsiAttiviTable.tsx`:

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

interface Corso {
  id: string
  name: string
  regione: string | null
  tipo_corso: string | null
  cu_number: string | null
  cu_url: string | null
  docente: string | null
}

export default function CorsiAttiviTable({ corsi }: { corsi: Corso[] }) {
  const [filtroRegione, setFiltroRegione] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  const regioni = [...new Set(corsi.map(c => c.regione).filter(Boolean))] as string[]
  const tipi = [...new Set(corsi.map(c => c.tipo_corso).filter(Boolean))] as string[]

  const filtrati = corsi.filter(c => {
    if (filtroRegione && c.regione !== filtroRegione) return false
    if (filtroTipo && c.tipo_corso !== filtroTipo) return false
    return true
  })

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(27,55,104,0.12)', background: 'rgba(255,255,255,0.55)' }}>
      {/* Header con filtri */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(27,55,104,0.08)' }}>
        <h2 className="text-sm font-semibold" style={{ color: '#1B3768' }}>
          Corsi attivi ({filtrati.length}{filtrati.length !== corsi.length ? ` di ${corsi.length}` : ''})
        </h2>
        <div className="flex gap-2">
          <select
            value={filtroRegione}
            onChange={e => setFiltroRegione(e.target.value)}
            className="text-xs rounded-lg px-2 py-1 border"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768', background: 'white' }}
          >
            <option value="">Tutte le regioni</option>
            {regioni.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            className="text-xs rounded-lg px-2 py-1 border"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768', background: 'white' }}
          >
            <option value="">Tutti i tipi</option>
            {tipi.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
        </div>
      </div>

      {/* Tabella */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(27,55,104,0.04)' }}>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: '#1B3768' }}>#</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: '#1B3768' }}>Nome corso</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: '#1B3768' }}>Regione</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: '#1B3768' }}>Tipo</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: '#1B3768' }}>Docente</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: '#1B3768' }}>CU</th>
            </tr>
          </thead>
          <tbody>
            {filtrati.map((corso, i) => (
              <tr
                key={corso.id}
                className="border-t hover:bg-white/60 transition-colors cursor-pointer"
                style={{ borderColor: 'rgba(27,55,104,0.06)' }}
              >
                <td className="px-4 py-2.5 text-xs" style={{ color: 'rgba(27,55,104,0.5)' }}>{i + 1}</td>
                <td className="px-4 py-2.5">
                  <Link
                    href={`/super-admin/corsi/${corso.id}`}
                    className="font-medium hover:underline"
                    style={{ color: '#1B3768' }}
                  >
                    {corso.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-xs" style={{ color: '#1B3768' }}>
                  {corso.regione ?? <span style={{ color: 'rgba(27,55,104,0.35)' }}>—</span>}
                </td>
                <td className="px-4 py-2.5 text-xs capitalize" style={{ color: '#1B3768' }}>
                  {corso.tipo_corso ?? <span style={{ color: 'rgba(27,55,104,0.35)' }}>—</span>}
                </td>
                <td className="px-4 py-2.5 text-xs" style={{ color: '#1B3768' }}>
                  {corso.docente ?? <span style={{ color: 'rgba(27,55,104,0.35)' }}>—</span>}
                </td>
                <td className="px-4 py-2.5 text-xs">
                  {corso.cu_number && corso.cu_url ? (
                    <a
                      href={corso.cu_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:underline"
                      style={{ color: '#0891B2' }}
                      onClick={e => e.stopPropagation()}
                    >
                      {corso.cu_number}
                      <ExternalLink size={11} />
                    </a>
                  ) : corso.cu_number ? (
                    <span style={{ color: '#1B3768' }}>{corso.cu_number}</span>
                  ) : (
                    <span style={{ color: 'rgba(27,55,104,0.35)' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtrati.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm" style={{ color: 'rgba(27,55,104,0.4)' }}>
                  Nessun corso trovato con i filtri selezionati
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Integrare `CorsiAttiviTable` nella dashboard super-admin**

Nella `page.tsx` super-admin, importare e usare il componente sopra la sezione widget esistente. Rimuovere il widget "Quiz recenti" se presente. Aggiungere 3 widget sopra la tabella:

```tsx
// Widget row sopra la tabella
<div className="grid grid-cols-3 gap-4 mb-6">
  <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(27,55,104,0.1)' }}>
    <p className="text-xs font-medium mb-1" style={{ color: 'rgba(27,55,104,0.6)' }}>Corsi attivi</p>
    <p className="text-2xl font-bold" style={{ color: '#1B3768' }}>{corsiAttivi?.length ?? 0}</p>
    <p className="text-xs mt-1" style={{ color: 'rgba(27,55,104,0.5)' }}>in corso adesso</p>
  </div>
  <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(27,55,104,0.1)' }}>
    <p className="text-xs font-medium mb-1" style={{ color: 'rgba(27,55,104,0.6)' }}>Scadenze prossime</p>
    <p className="text-2xl font-bold" style={{ color: '#1B3768' }}>{scadenzeCount}</p>
    <p className="text-xs mt-1" style={{ color: 'rgba(27,55,104,0.5)' }}>entro 7 giorni</p>
  </div>
  <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(27,55,104,0.1)' }}>
    <p className="text-xs font-medium mb-1" style={{ color: 'rgba(27,55,104,0.6)' }}>Task da valutare</p>
    <p className="text-2xl font-bold" style={{ color: '#1B3768' }}>{taskCount}</p>
    <p className="text-xs mt-1" style={{ color: 'rgba(27,55,104,0.5)' }}>risposte in attesa</p>
  </div>
</div>

<CorsiAttiviTable corsi={corsiMappati} />
```

Nota: `scadenzeCount` e `taskCount` sono già calcolati nella dashboard esistente o si recuperano dalle query esistenti.

- [ ] **Step 5: Verificare visivamente**

```
http://localhost:3001/super-admin
```

Verificare:
- 3 widget in cima con numeri
- Tabella corsi con colonne #, Nome, Regione, Tipo, Docente, CU
- Filtri Regione e Tipo funzionanti
- Click su nome corso → naviga al dettaglio corso
- CU con link → apre in nuova tab

- [ ] **Step 6: Commit**

```bash
git add app/\(dashboard\)/super-admin/page.tsx app/\(dashboard\)/super-admin/CorsiAttiviTable.tsx
git commit -m "feat: dashboard super-admin con lista corsi compatta e widget"
```

---

## Task 4: Dashboard Docente — Testo esplicativo widget

**Files:**
- Modify: `app/(dashboard)/docente/page.tsx`

- [ ] **Step 1: Leggere il file corrente**

```bash
cat ~/figc-lms/app/\(dashboard\)/docente/page.tsx | head -80
```

- [ ] **Step 2: Aggiungere testo esplicativo a ogni widget esistente**

Per ogni `StatsCard` o widget numerico esistente nella dashboard docente, aggiungere una sotto-descrizione esplicativa. Pattern da seguire su ogni widget numerico:

```tsx
// PRIMA (esempio):
<StatsCard value={corsi.length} label="Corsi" icon={<BookOpen />} />

// DOPO:
<StatsCard
  value={corsi.length}
  label="Corsi attivi"
  description="corsi che stai seguendo ora"
  icon={<BookOpen />}
/>
```

Verificare il componente `StatsCard` in `components/dashboard/StatsCard.tsx` e aggiungere la prop `description?: string` se non presente.

- [ ] **Step 3: Aggiornare `StatsCard` per supportare `description`**

```bash
cat ~/figc-lms/components/dashboard/StatsCard.tsx
```

Se non ha `description`, aggiungere:

```tsx
interface StatsCardProps {
  value: number | string
  label: string
  description?: string   // ← aggiungere
  icon: React.ReactNode
  href?: string
}

// Nel JSX, sotto il label:
{description && (
  <p className="text-xs mt-0.5" style={{ color: 'rgba(27,55,104,0.5)' }}>{description}</p>
)}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/docente/page.tsx components/dashboard/StatsCard.tsx
git commit -m "feat: dashboard docente con testo esplicativo widget"
```

---

## Task 5: Dashboard Studente — Widget prossima sessione

**Files:**
- Modify: `app/(dashboard)/studente/page.tsx`

- [ ] **Step 1: Leggere la dashboard studente**

```bash
cat ~/figc-lms/app/\(dashboard\)/studente/page.tsx
```

- [ ] **Step 2: Aggiungere query prossima sessione**

Nella query server della dashboard studente, aggiungere:

```typescript
// Prossima lezione calendario dello studente
const oggi = new Date().toISOString().split('T')[0]
const { data: prossimaLezione } = await supabase
  .from('corso_eventi')
  .select('data, ora_inizio, materia, corso_id, courses(name)')
  .gte('data', oggi)
  .order('data', { ascending: true })
  .limit(1)
  .single()
```

Nota: la tabella `corso_eventi` è creata da Stream B. Se non ancora disponibile, wrappare la query in try/catch e mostrare il widget solo se i dati esistono.

- [ ] **Step 3: Aggiungere widget "Prossima sessione" in cima alla dashboard**

```tsx
{prossimaLezione && (
  <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(8,145,178,0.2)' }}>
    <p className="text-xs font-medium mb-1" style={{ color: '#0891B2' }}>Prossima lezione</p>
    <p className="text-base font-bold" style={{ color: '#1B3768' }}>{prossimaLezione.materia}</p>
    <p className="text-sm mt-0.5" style={{ color: 'rgba(27,55,104,0.7)' }}>
      {prossimaLezione.courses?.name} · {new Date(prossimaLezione.data).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })} ore {prossimaLezione.ora_inizio?.slice(0, 5)}
    </p>
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/studente/page.tsx
git commit -m "feat: dashboard studente con widget prossima sessione"
```

---

## Task 6: Merge worktree e test integrato

- [ ] **Step 1: Verificare che tutti i task siano completati**

```bash
cd ~/figc-lms && git log --oneline feature/ux-redesign | head -10
```

- [ ] **Step 2: Merge in main**

```bash
git checkout main
git merge feature/ux-redesign --no-ff -m "feat: UX redesign — sidebar Notion-style, dashboard aggiornate"
```

- [ ] **Step 3: Test completo locale**

```bash
npm run dev
```

Verificare per ogni ruolo (super_admin, docente, studente) che:
- Sidebar si apre e chiude correttamente
- Stato persistito in localStorage
- Dashboard mostra i widget corretti
- Nessuna regressione su pagine esistenti

- [ ] **Step 4: TypeScript check finale**

```bash
npx tsc --noEmit
```

Expected: zero errori.
