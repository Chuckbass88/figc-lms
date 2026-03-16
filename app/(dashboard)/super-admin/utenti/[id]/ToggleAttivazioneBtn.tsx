'use client'

import { useState } from 'react'
import { Loader2, UserCheck, UserX } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ToggleAttivazioneBtn({ userId, isActive }: { userId: string; isActive: boolean }) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const router = useRouter()

  async function toggle() {
    setLoading(true)
    await fetch('/api/utenti/toggle-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, is_active: !isActive }),
    })
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition border ${
          isActive
            ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
            : 'border-green-200 text-green-700 hover:bg-green-50'
        }`}
      >
        {isActive ? <UserX size={14} /> : <UserCheck size={14} />}
        {isActive ? 'Disattiva' : 'Riattiva'}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
      <p className="text-xs text-gray-600 font-medium">
        {isActive ? 'Disattivare questo utente?' : 'Riattivare questo utente?'}
      </p>
      <button
        onClick={() => setOpen(false)}
        className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded"
      >
        No
      </button>
      <button
        onClick={toggle}
        disabled={loading}
        className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg text-white transition disabled:opacity-60 ${
          isActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {loading && <Loader2 size={11} className="animate-spin" />}
        {isActive ? 'Disattiva' : 'Riattiva'}
      </button>
    </div>
  )
}
