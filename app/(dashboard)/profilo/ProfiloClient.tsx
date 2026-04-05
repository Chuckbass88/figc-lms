'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, Shield, Pencil, Check, X, Lock, Eye, EyeOff, Loader2, BookOpen, Users, GraduationCap, TrendingUp, Award } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type UserRole = 'super_admin' | 'docente' | 'studente'

type RoleStats =
  | { role: 'studente'; activeCoursesCount: number; avgAttendance: number | null; idoneiCount: number }
  | { role: 'docente'; assignedCoursesCount: number; totalStudents: number }
  | { role: 'super_admin'; totalUsers: number; totalCourses: number }

interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
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

export default function ProfiloClient({ profile, stats }: { profile: Profile; stats: RoleStats | null }) {
  const supabase = createClient()
  const router = useRouter()

  // Nome
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(profile.full_name)
  const [nameInput, setNameInput] = useState(profile.full_name)
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Password
  const [showPwSection, setShowPwSection] = useState(false)
  const [pw, setPw] = useState({ current: '', new: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false })
  const [savingPw, setSavingPw] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function saveName() {
    if (!nameInput.trim() || nameInput === name) { setEditingName(false); return }
    setSavingName(true)
    setNameMsg(null)
    const { error } = await supabase.from('profiles').update({ full_name: nameInput.trim() }).eq('id', profile.id)
    if (error) {
      setNameMsg({ ok: false, text: 'Errore durante il salvataggio.' })
    } else {
      setName(nameInput.trim())
      setEditingName(false)
      setNameMsg({ ok: true, text: 'Nome aggiornato.' })
      setTimeout(() => setNameMsg(null), 3000)
      // Aggiorna header e sidebar (server components del layout)
      router.refresh()
    }
    setSavingName(false)
  }

  async function savePassword() {
    setPwMsg(null)
    if (!pw.new || !pw.confirm) { setPwMsg({ ok: false, text: 'Compila tutti i campi.' }); return }
    if (pw.new.length < 8) { setPwMsg({ ok: false, text: 'La password deve avere almeno 8 caratteri.' }); return }
    if (pw.new !== pw.confirm) { setPwMsg({ ok: false, text: 'Le password non coincidono.' }); return }

    setSavingPw(true)
    const { error } = await supabase.auth.updateUser({ password: pw.new })
    if (error) {
      setPwMsg({ ok: false, text: error.message ?? 'Errore durante il cambio password.' })
    } else {
      setPwMsg({ ok: true, text: 'Password aggiornata con successo.' })
      setPw({ current: '', new: '', confirm: '' })
      setShowPwSection(false)
      setTimeout(() => setPwMsg(null), 4000)
    }
    setSavingPw(false)
  }

  const initials = name.split(' ').map(n => n.charAt(0)).slice(0, 2).join('').toUpperCase()

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Il mio profilo</h2>
        <p className="text-gray-500 text-sm mt-1">Gestisci le tue informazioni personali</p>
      </div>

      {/* Avatar + info base */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-5 mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
            style={{ backgroundColor: '#1565C0' }}
          >
            {initials}
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{name}</p>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLORS[profile.role]}`}>
              {ROLE_LABELS[profile.role]}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Nome */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
              <User size={12} /> Nome completo
            </label>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditingName(false); setNameInput(name) } }}
                  autoFocus
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={saveName}
                  disabled={savingName}
                  className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {savingName ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </button>
                <button
                  onClick={() => { setEditingName(false); setNameInput(name) }}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-sm text-gray-900">{name}</span>
                <button
                  onClick={() => { setEditingName(true); setNameInput(name) }}
                  className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
            {nameMsg && (
              <p className={`text-xs mt-1.5 ${nameMsg.ok ? 'text-green-600' : 'text-red-500'}`}>{nameMsg.text}</p>
            )}
          </div>

          {/* Email (non modificabile) */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
              <Mail size={12} /> Email
            </label>
            <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-sm text-gray-500">{profile.email}</span>
            </div>
          </div>

          {/* Ruolo (non modificabile) */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
              <Shield size={12} /> Ruolo
            </label>
            <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-sm text-gray-500">{ROLE_LABELS[profile.role]}</span>
            </div>
          </div>

          {/* Data iscrizione */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Account creato il {new Date(profile.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Statistiche ruolo */}
      {stats && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Le mie statistiche</p>
          <div className="grid grid-cols-2 gap-4">
            {stats.role === 'studente' && (
              <>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  <BookOpen size={18} className="text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Corsi attivi</p>
                    <p className="text-lg font-bold text-gray-900">{stats.activeCoursesCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                  <TrendingUp size={18} className="text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Media presenze</p>
                    <p className="text-lg font-bold text-gray-900">
                      {stats.avgAttendance !== null ? `${stats.avgAttendance}%` : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl col-span-2">
                  <Award size={18} className="text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Corsi con idoneità</p>
                    <p className="text-lg font-bold text-gray-900">
                      {stats.idoneiCount} <span className="text-sm font-normal text-gray-400">su {stats.activeCoursesCount}</span>
                    </p>
                  </div>
                </div>
              </>
            )}
            {stats.role === 'docente' && (
              <>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  <BookOpen size={18} className="text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Corsi assegnati</p>
                    <p className="text-lg font-bold text-gray-900">{stats.assignedCoursesCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                  <GraduationCap size={18} className="text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Corsisti totali</p>
                    <p className="text-lg font-bold text-gray-900">{stats.totalStudents}</p>
                  </div>
                </div>
              </>
            )}
            {stats.role === 'super_admin' && (
              <>
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                  <Users size={18} className="text-purple-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Utenti totali</p>
                    <p className="text-lg font-bold text-gray-900">{stats.totalUsers}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  <BookOpen size={18} className="text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Corsi totali</p>
                    <p className="text-lg font-bold text-gray-900">{stats.totalCourses}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cambio password */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => { setShowPwSection(v => !v); setPwMsg(null) }}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-3">
            <Lock size={16} className="text-gray-500" />
            <span className="font-semibold text-gray-900 text-sm">Cambia password</span>
          </div>
          <span className="text-xs text-blue-600">{showPwSection ? 'Annulla' : 'Modifica'}</span>
        </button>

        {showPwSection && (
          <div className="px-6 pb-5 pt-1 space-y-3 border-t border-gray-100">
            {[
              { key: 'new', label: 'Nuova password' },
              { key: 'confirm', label: 'Conferma password' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">{label}</label>
                <div className="relative">
                  <input
                    type={showPw[key as keyof typeof showPw] ? 'text' : 'password'}
                    value={pw[key as keyof typeof pw]}
                    onChange={e => setPw(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw[key as keyof typeof showPw] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            ))}

            {pwMsg && (
              <p className={`text-xs ${pwMsg.ok ? 'text-green-600' : 'text-red-500'}`}>{pwMsg.text}</p>
            )}

            <button
              onClick={savePassword}
              disabled={savingPw}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white text-sm font-semibold transition disabled:opacity-60 hover:opacity-90"
              style={{ backgroundColor: '#1565C0' }}
            >
              {savingPw && <Loader2 size={14} className="animate-spin" />}
              Aggiorna password
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
