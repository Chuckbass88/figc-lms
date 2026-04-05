'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserCog } from 'lucide-react'

const ROLE_OPTIONS = [
  { value: 'studente', label: 'Corsista' },
  { value: 'docente', label: 'Docente' },
  { value: 'super_admin', label: 'Super Admin' },
]

export default function CambiaRuoloBtn({ userId, currentRole }: { userId: string; currentRole: string }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(currentRole)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSave() {
    if (selected === currentRole) { setOpen(false); return }
    setLoading(true)
    setError(null)
    const res = await fetch('/api/admin/cambia-ruolo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newRole: selected }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Errore'); return }
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
      >
        <UserCog size={14} /> Ruolo
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Cambia ruolo</h3>
            <div className="space-y-2">
              {ROLE_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${selected === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={selected === opt.value}
                    onChange={() => setSelected(opt.value)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-800">{opt.label}</span>
                </label>
              ))}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setOpen(false); setSelected(currentRole); setError(null) }}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={loading || selected === currentRole}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-50"
                style={{ backgroundColor: '#1565C0' }}
              >
                {loading ? 'Salvando...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
