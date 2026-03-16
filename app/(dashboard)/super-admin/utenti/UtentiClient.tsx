'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users, GraduationCap, UserCheck, Search, ChevronDown, Power, PowerOff, UserPlus, X, Loader2, Eye, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ImportaCSV from '@/components/utenti/ImportaCSV'

type UserRole = 'super_admin' | 'docente' | 'studente'

interface User {
  id: string
  full_name: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  docente: 'Docente',
  studente: 'Corsista',
}
const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  docente: 'bg-blue-100 text-blue-700',
  studente: 'bg-green-100 text-green-700',
}

export default function UtentiClient({ initialUsers, currentUserId }: { initialUsers: User[]; currentUserId: string }) {
  const supabase = createClient()
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [loading, setLoading] = useState<string | null>(null)
  const [openRoleMenu, setOpenRoleMenu] = useState<string | null>(null)

  // Form nuovo utente
  const [showForm, setShowForm] = useState(false)
  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role: 'studente' as UserRole })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  function exportCSV() {
    const ROLE_EXPORT: Record<UserRole, string> = { super_admin: 'Super Admin', docente: 'Docente', studente: 'Corsista' }
    const headers = ['Nome completo', 'Email', 'Ruolo', 'Stato', 'Iscritto il']
    const rows = filtered.map(u => [
      u.full_name,
      u.email,
      ROLE_EXPORT[u.role],
      u.is_active ? 'Attivo' : 'Disattivato',
      new Date(u.created_at).toLocaleDateString('it-IT'),
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `utenti_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function createUser() {
    if (!newUser.full_name.trim() || !newUser.email.trim() || !newUser.password.trim()) return
    setCreating(true)
    setCreateError('')
    const res = await fetch('/api/utenti/crea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    })
    const data = await res.json()
    if (!res.ok) {
      setCreateError(data.error ?? 'Errore durante la creazione')
    } else {
      // Aggiungi utente alla lista locale
      const created: User = {
        id: data.userId,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        is_active: true,
        created_at: new Date().toISOString(),
      }
      setUsers(prev => [created, ...prev])
      setNewUser({ full_name: '', email: '', password: '', role: 'studente' })
      setShowForm(false)
    }
    setCreating(false)
  }

  const filtered = users.filter(u => {
    const matchSearch = u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? u.is_active : !u.is_active)
    return matchSearch && matchRole && matchStatus
  })

  const docenti = users.filter(u => u.role === 'docente').length
  const studenti = users.filter(u => u.role === 'studente').length
  const admins = users.filter(u => u.role === 'super_admin').length
  const inattivi = users.filter(u => !u.is_active).length

  async function changeRole(userId: string, newRole: UserRole) {
    setLoading(userId)
    setOpenRoleMenu(null)
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
    setLoading(null)
  }

  async function toggleActive(userId: string, currentActive: boolean) {
    setLoading(`active-${userId}`)
    const { error } = await supabase.from('profiles').update({ is_active: !currentActive }).eq('id', userId)
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentActive } : u))
    }
    setLoading(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestione Utenti</h2>
          <p className="text-gray-500 text-sm mt-1">{users.length} utenti nel sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
          >
            <Download size={14} /> Esporta CSV
          </button>
          <ImportaCSV onImported={newUsers => setUsers(prev => [...newUsers, ...prev])} />
          <button
            onClick={() => { setShowForm(v => !v); setCreateError('') }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition hover:opacity-90"
            style={{ backgroundColor: '#003DA5' }}
          >
            <UserPlus size={15} />
            Nuovo utente
          </button>
        </div>
      </div>

      {/* Form nuovo utente */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800 text-sm">Crea nuovo utente</p>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 transition">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Nome completo *</label>
              <input
                type="text"
                value={newUser.full_name}
                onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))}
                placeholder="Mario Rossi"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Email *</label>
              <input
                type="email"
                value={newUser.email}
                onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                placeholder="mario@figclms.it"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Password *</label>
              <input
                type="password"
                value={newUser.password}
                onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                placeholder="Min. 8 caratteri"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Ruolo *</label>
              <select
                value={newUser.role}
                onChange={e => setNewUser(p => ({ ...p, role: e.target.value as UserRole }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="studente">Corsista</option>
                <option value="docente">Docente</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => { setShowForm(false); setCreateError('') }}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              Annulla
            </button>
            <button
              onClick={createUser}
              disabled={creating || !newUser.full_name.trim() || !newUser.email.trim() || !newUser.password.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition disabled:opacity-60"
              style={{ backgroundColor: '#003DA5' }}
            >
              {creating && <Loader2 size={13} className="animate-spin" />}
              Crea utente
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Amministratori', count: admins, icon: <Users size={17} />, color: 'bg-purple-50 text-purple-600 border-purple-100' },
          { label: 'Docenti', count: docenti, icon: <UserCheck size={17} />, color: 'bg-blue-50 text-blue-600 border-blue-100' },
          { label: 'Corsisti', count: studenti, icon: <GraduationCap size={17} />, color: 'bg-green-50 text-green-600 border-green-100' },
          { label: 'Disattivati', count: inattivi, icon: <PowerOff size={17} />, color: 'bg-red-50 text-red-500 border-red-100' },
        ].map(item => (
          <div key={item.label} className="rounded-xl border bg-white shadow-sm p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${item.color}`}>{item.icon}</div>
            <div>
              <p className="text-xl font-bold text-gray-900">{item.count}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabella */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <h3 className="font-semibold text-gray-900 text-sm">Tutti gli utenti</h3>
          {/* Filtro ruolo */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {([['all', 'Tutti'], ['super_admin', 'Admin'], ['docente', 'Docenti'], ['studente', 'Corsisti']] as [UserRole | 'all', string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setRoleFilter(val)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  roleFilter === val ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {([['all', 'Tutti'], ['active', 'Attivi'], ['inactive', 'Disattivati']] as ['all' | 'active' | 'inactive', string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  statusFilter === val ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca per nome o email..."
              className="pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-56"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ruolo</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stato</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Iscritto il</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(user => {
                const isSelf = user.id === currentUserId
                const isLoadingThis = loading === user.id || loading === `active-${user.id}`

                return (
                  <tr key={user.id} className={`transition ${!user.is_active ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${!user.is_active ? 'bg-gray-400' : ''}`}
                          style={user.is_active ? { backgroundColor: '#003DA5' } : {}}>
                          {user.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.full_name}</p>
                          {isSelf && <p className="text-xs text-blue-500">Tu</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{user.email}</td>

                    {/* Ruolo con dropdown */}
                    <td className="px-5 py-3">
                      {isSelf ? (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLORS[user.role]}`}>
                          {ROLE_LABELS[user.role]}
                        </span>
                      ) : (
                        <div className="relative">
                          <button
                            onClick={() => setOpenRoleMenu(openRoleMenu === user.id ? null : user.id)}
                            disabled={isLoadingThis || !user.is_active}
                            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition disabled:opacity-50 ${ROLE_COLORS[user.role]}`}
                          >
                            {ROLE_LABELS[user.role]}
                            <ChevronDown size={11} />
                          </button>
                          {openRoleMenu === user.id && (
                            <div className="absolute z-20 top-full left-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg py-1 min-w-[130px]">
                              {(['super_admin', 'docente', 'studente'] as UserRole[]).map(role => (
                                <button
                                  key={role}
                                  onClick={() => changeRole(user.id, role)}
                                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition ${user.role === role ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
                                >
                                  {ROLE_LABELS[role]}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Stato attivo */}
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {user.is_active ? 'Attivo' : 'Disattivato'}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {new Date(user.created_at).toLocaleDateString('it-IT')}
                    </td>

                    {/* Azioni */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/super-admin/utenti/${user.id}`}
                          title="Visualizza dettaglio"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition"
                        >
                          <Eye size={14} />
                        </Link>
                        {!isSelf && (
                          <button
                            onClick={() => toggleActive(user.id, user.is_active)}
                            disabled={isLoadingThis}
                            title={user.is_active ? 'Disattiva utente' : 'Riattiva utente'}
                            className={`p-1.5 rounded-lg transition disabled:opacity-40 ${
                              user.is_active
                                ? 'text-gray-400 hover:bg-red-50 hover:text-red-500'
                                : 'text-gray-400 hover:bg-green-50 hover:text-green-600'
                            }`}
                          >
                            {user.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400 text-sm">
                    Nessun utente trovato.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chiudi dropdown cliccando fuori */}
      {openRoleMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenRoleMenu(null)} />
      )}
    </div>
  )
}
