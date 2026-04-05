'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Check, Eye, EyeOff } from 'lucide-react'

interface Props {
  token: string
  courseId: string
}

export default function RegistrazioneForm({ token, courseId }: Props) {
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [email, setEmail] = useState('')
  const [cellulare, setCellulare] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [termini, setTermini] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const canSubmit = nome.trim() && cognome.trim() && email.trim() && password.length >= 8 && privacy && termini

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/invito/registra', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, nome: nome.trim(), cognome: cognome.trim(), email: email.trim(), password, cellulare: cellulare.trim() }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Errore durante la registrazione. Riprova.')
      setLoading(false)
      return
    }

    // Login automatico
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (signInError) {
      setLoading(false)
      router.push('/login?message=Account+creato.+Accedi+con+le+tue+credenziali.')
      return
    }

    router.push(`/studente/corsi/${courseId}`)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Mario"
            required
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Cognome</label>
          <input
            type="text"
            value={cognome}
            onChange={e => setCognome(e.target.value)}
            placeholder="Rossi"
            required
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="mario.rossi@email.it"
          required
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Numero di cellulare</label>
        <input
          type="tel"
          value={cellulare}
          onChange={e => setCellulare(e.target.value)}
          placeholder="+39 333 1234567"
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Password <span className="text-gray-400 font-normal normal-case">(min. 8 caratteri)</span></label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Scegli una password sicura"
            required
            minLength={8}
            className="w-full px-3 py-2.5 pr-10 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      <div className="space-y-2.5 pt-1">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={privacy}
            onChange={e => setPrivacy(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-blue-600 flex-shrink-0"
          />
          <span className="text-xs text-gray-600">
            Ho letto e accetto la <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Privacy Policy</a>
          </span>
        </label>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={termini}
            onChange={e => setTermini(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-blue-600 flex-shrink-0"
          />
          <span className="text-xs text-gray-600">
            Ho letto e accetto i <a href="/termini" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Termini di Utilizzo</a>
          </span>
        </label>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !canSubmit}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition disabled:opacity-50"
        style={{ backgroundColor: '#1565C0' }}
      >
        {loading ? (
          <><Loader2 size={14} className="animate-spin" /> Registrazione in corso...</>
        ) : (
          <><Check size={14} /> Registrati e iscriviti al corso</>
        )}
      </button>
    </form>
  )
}
