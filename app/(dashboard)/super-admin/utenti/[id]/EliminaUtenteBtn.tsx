'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, X, Loader2, AlertTriangle } from 'lucide-react'

export default function EliminaUtenteBtn({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const confirmText = userName.split(' ')[0] // primo nome come conferma
  const isValid = confirm === confirmText

  async function handleDelete() {
    if (!isValid) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/utenti/elimina', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Errore durante l\'eliminazione')
      setLoading(false)
    } else {
      router.push('/super-admin/utenti')
    }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setConfirm(''); setError('') }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 border border-red-200 transition"
      >
        <Trash2 size={14} /> Elimina utente
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500" />
                <p className="font-semibold text-gray-900 text-sm">Elimina utente</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Stai per eliminare definitivamente <strong>{userName}</strong>. Questa azione è <strong>irreversibile</strong> e rimuoverà l'account e tutti i dati associati.
              </p>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  Digita <strong>{confirmText}</strong> per confermare
                </label>
                <input
                  type="text"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder={confirmText}
                  className={`w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 ${isValid ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500'}`}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || !isValid}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 hover:opacity-90 transition bg-red-600"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {loading ? 'Eliminazione...' : 'Elimina definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
