'use client'

import { useState } from 'react'
import { KeyRound, X, Loader2, Eye, EyeOff, Check } from 'lucide-react'

export default function ResetPasswordBtn({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const mismatch = confirm.length > 0 && password !== confirm
  const valid = password.length >= 8 && password === confirm

  async function handleReset() {
    if (!valid) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/utenti/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newPassword: password }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Errore durante il reset')
    } else {
      setDone(true)
      setTimeout(() => { setDone(false); setOpen(false); setPassword(''); setConfirm('') }, 1500)
    }
    setLoading(false)
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setDone(false); setError('') }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
      >
        <KeyRound size={14} /> Reset password
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="font-semibold text-gray-900 text-sm">Imposta nuova password</p>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nuova password *</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 caratteri"
                    className="w-full px-3 py-2.5 pr-10 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {password.length > 0 && password.length < 8 && (
                  <p className="text-xs text-red-500 mt-1">Minimo 8 caratteri</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Conferma password *</label>
                <input
                  type={show ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Ripeti la password"
                  className={`w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${mismatch ? 'border-red-300' : 'border-gray-200'}`}
                />
                {mismatch && <p className="text-xs text-red-500 mt-1">Le password non coincidono</p>}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {done && (
                <p className="text-sm text-green-600 font-medium flex items-center gap-1.5">
                  <Check size={14} /> Password aggiornata con successo
                </p>
              )}
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Annulla
              </button>
              <button
                onClick={handleReset}
                disabled={loading || !valid}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 hover:opacity-90 transition"
                style={{ backgroundColor: '#003DA5' }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                {loading ? 'Salvataggio...' : 'Imposta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
