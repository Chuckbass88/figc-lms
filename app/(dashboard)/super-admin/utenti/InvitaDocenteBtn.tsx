'use client'

import { useState } from 'react'
import { UserPlus, Copy, Check, Loader2, X, Link as LinkIcon, ExternalLink } from 'lucide-react'

export default function InvitaDocenteBtn() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generaLink() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/admin/genera-invito-docente', { method: 'POST' })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Errore nella generazione del link')
      setLoading(false)
      return
    }

    const origin = window.location.origin
    setLink(`${origin}/invito-docente/${json.token}`)
    setLoading(false)
  }

  async function copia() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function apri() {
    setOpen(true)
    setLink(null)
    setError(null)
    generaLink()
  }

  function chiudi() {
    setOpen(false)
    setLink(null)
    setError(null)
  }

  return (
    <>
      <button
        onClick={apri}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition hover:opacity-90"
        style={{ backgroundColor: '#1B3768' }}
      >
        <UserPlus size={15} />
        Invita docente
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-xl p-2">
                  <LinkIcon size={20} className="text-blue-700" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Invita un docente</h3>
                  <p className="text-xs text-gray-500">Genera e condividi il link di registrazione</p>
                </div>
              </div>
              <button onClick={chiudi} className="text-gray-400 hover:text-gray-600 transition">
                <X size={20} />
              </button>
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 py-6 text-gray-500">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Generazione link...</span>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
            )}

            {link && (
              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 font-medium mb-2">Link di invito (valido 7 giorni)</p>
                  <p className="text-xs font-mono text-gray-700 break-all leading-relaxed">{link}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={copia}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-blue-200 text-blue-700 font-semibold text-sm hover:bg-blue-50 transition"
                  >
                    {copied ? <><Check size={14} /> Copiato!</> : <><Copy size={14} /> Copia link</>}
                  </button>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition"
                  >
                    <ExternalLink size={14} />
                    Apri
                  </a>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-amber-700">
                    <strong>⚠️ Questo link può essere usato una sola volta</strong> e scade dopo 7 giorni.
                    Condividilo direttamente con il docente tramite email o messaggio.
                  </p>
                </div>

                <button
                  onClick={generaLink}
                  className="w-full text-xs text-gray-500 hover:text-gray-700 text-center py-1 underline underline-offset-2"
                >
                  Genera un nuovo link
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
