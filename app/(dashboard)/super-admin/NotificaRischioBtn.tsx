'use client'

import { useState } from 'react'
import { Bell, Loader2, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function NotificaRischioBtn({ studentIds }: { studentIds: string[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const supabase = createClient()

  async function invia() {
    setLoading(true)
    await supabase.from('notifications').insert(
      studentIds.map(id => ({
        user_id: id,
        title: 'Presenze a rischio idoneità',
        message: 'La tua percentuale di presenze è attualmente sotto la soglia del 75%. Ti invitiamo a frequentare regolarmente le lezioni per ottenere l\'idoneità al corso.',
        read: false,
      }))
    )
    setLoading(false)
    setOpen(false)
    setDone(true)
    setTimeout(() => setDone(false), 4000)
  }

  if (studentIds.length === 0) return null

  return (
    <>
      {done ? (
        <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-green-100 text-green-700">
          <Check size={11} /> Notifiche inviate
        </span>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-200 text-amber-800 hover:bg-amber-300 transition"
        >
          <Bell size={11} /> Notifica tutti
        </button>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-sm">Notifica corsisti a rischio</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Verrà inviata una notifica a <strong>{studentIds.length} corsisti</strong> con presenze sotto il 75%, invitandoli a frequentare regolarmente.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                Annulla
              </button>
              <button
                onClick={invia}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition bg-amber-600"
              >
                {loading && <Loader2 size={13} className="animate-spin" />}
                <Bell size={13} /> Invia notifiche
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
