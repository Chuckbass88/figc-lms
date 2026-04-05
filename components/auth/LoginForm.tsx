'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types'

const ROLE_ROUTES: Record<UserRole, string> = {
  super_admin: '/super-admin',
  docente: '/docente',
  studente: '/studente',
}

export default function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Credenziali non valide. Riprova.')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Errore di autenticazione.'); setLoading(false); return }

    if (redirectTo) {
      router.push(redirectTo)
      router.refresh()
      return
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile) { setError('Profilo utente non trovato.'); setLoading(false); return }

    router.push(ROLE_ROUTES[profile.role as UserRole])
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="nome@esempio.it"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent text-gray-900 placeholder-gray-400 transition text-sm"
          style={{ '--tw-ring-color': '#1565C0' } as React.CSSProperties}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent text-gray-900 transition text-sm"
          style={{ '--tw-ring-color': '#1565C0' } as React.CSSProperties}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2 hover:opacity-90"
        style={{ backgroundColor: '#1565C0' }}
      >
        {loading && <Loader2 size={15} className="animate-spin" />}
        {loading ? 'Accesso in corso...' : 'Accedi'}
      </button>
    </form>
  )
}
