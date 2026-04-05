'use client'

import { useEffect, useRef, useState } from 'react'
import { Link2, X, Copy, Check, QrCode, RefreshCw, Loader2 } from 'lucide-react'
import QRCode from 'qrcode'

interface Props {
  courseId: string
  courseName: string
  inviteToken: string | null
}

export default function LinkInvitoBtn({ courseId, courseName, inviteToken: initialToken }: Props) {
  const [open, setOpen] = useState(false)
  const [token, setToken] = useState(initialToken)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const inviteUrl = token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invito/${token}`
    : null

  useEffect(() => {
    if (open && inviteUrl && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, inviteUrl, {
        width: 200,
        margin: 2,
        color: { dark: '#1B3768', light: '#ffffff' },
      })
    }
  }, [open, inviteUrl])

  async function generaToken() {
    setRegenerating(true)
    const res = await fetch('/api/admin/genera-token-invito', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId }),
    })
    const json = await res.json()
    if (json.token) setToken(json.token)
    setRegenerating(false)
  }

  async function copiaLink() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition"
      >
        <QrCode size={14} /> Link invito
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900">Link di invito</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Condividi questo link o QR code con i corsisti di <strong>{courseName}</strong>. Chi lo apre e accede con il proprio account verrà automaticamente iscritto al corso.
            </p>

            {token ? (
              <>
                {/* QR Code */}
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <canvas ref={canvasRef} />
                  </div>
                </div>

                {/* Link copiabile */}
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 font-mono overflow-hidden">
                    <Link2 size={12} className="flex-shrink-0 text-gray-400" />
                    <span className="truncate">{inviteUrl}</span>
                  </div>
                  <button
                    onClick={copiaLink}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition flex-shrink-0 ${
                      copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {copied ? <><Check size={13} /> Copiato</> : <><Copy size={13} /> Copia</>}
                  </button>
                </div>

                {/* Rigenera */}
                <button
                  onClick={generaToken}
                  disabled={regenerating}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition disabled:opacity-50"
                >
                  {regenerating ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                  Rigenera link (invalida il precedente)
                </button>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 mb-4">Nessun link generato per questo corso.</p>
                <button
                  onClick={generaToken}
                  disabled={regenerating}
                  className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                  style={{ backgroundColor: '#1565C0' }}
                >
                  {regenerating ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
                  Genera link invito
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
