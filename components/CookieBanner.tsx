'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Cookie, X, Check } from 'lucide-react'

const CONSENT_KEY = 'coachlab_cookie_consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(CONSENT_KEY)
    if (!saved) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setVisible(false)
  }

  function acceptNecessary() {
    localStorage.setItem(CONSENT_KEY, 'necessary')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 pointer-events-none">
      <div
        className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 pointer-events-auto"
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}
      >
        <div className="flex items-start gap-3">
          {/* Icona */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EFF4FF' }}>
            <Cookie size={18} style={{ color: '#1565C0' }} />
          </div>

          {/* Contenuto */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 mb-1">Utilizziamo i cookie 🍪</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Usiamo cookie tecnici necessari per il funzionamento della piattaforma (sessione di autenticazione) e, con il tuo consenso, cookie analytics anonimi per migliorare il servizio.{' '}
              <Link href="/cookie" className="text-blue-600 hover:underline font-medium">
                Cookie Policy
              </Link>
              {' '}·{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline font-medium">
                Privacy Policy
              </Link>
            </p>

            {/* Bottoni */}
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={accept}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90"
                style={{ backgroundColor: '#1565C0' }}
              >
                <Check size={12} />
                Accetta tutti
              </button>
              <button
                onClick={acceptNecessary}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
              >
                Solo necessari
              </button>
            </div>
          </div>

          {/* Chiudi (solo necessari) */}
          <button
            onClick={acceptNecessary}
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            aria-label="Chiudi"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
