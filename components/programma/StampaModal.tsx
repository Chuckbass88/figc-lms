'use client'

import { useState } from 'react'
import { Printer, X, Mail, Check } from 'lucide-react'
import type { CorsoEvento, CorsoPresenza } from '@/lib/types'

interface Student { id: string; full_name: string }

interface Props {
  corseName: string
  corsoId: string
  corseLocation?: string | null
  corseStartDate?: string | null
  corseEndDate?: string | null
  eventi: CorsoEvento[]
  presenze: CorsoPresenza[]
  studenti: Student[]
  sections: { elenco: boolean; presenze: boolean }
  onSectionsChange: (s: { elenco: boolean; presenze: boolean }) => void
}

export default function StampaModal(props: Props) {
  const { corseName, corsoId, eventi, presenze, studenti, sections, onSectionsChange } = props
  const [open, setOpen] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [emailError, setEmailError] = useState('')

  function handlePrint() {
    setOpen(false)
    setTimeout(() => window.print(), 100)
  }

  async function handleSendEmail() {
    if (!emailInput.trim()) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())) {
      setEmailError('Inserisci un indirizzo email valido')
      return
    }
    setEmailError('')
    setSending(true)
    try {
      const res = await fetch(`/api/corsi/${corsoId}/calendario/invia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput }),
      })
      if (!res.ok) {
        setEmailError('Errore durante l\'invio. Riprova.')
        setSending(false)
        return
      }
      setSending(false)
      setSent(true)
      setTimeout(() => { setSent(false); setOpen(false) }, 2000)
    } catch {
      setEmailError('Errore di rete. Riprova.')
      setSending(false)
    }
  }

  const toggle = (k: 'elenco' | 'presenze') =>
    onSectionsChange({ ...sections, [k]: !sections[k] })

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition hover:bg-gray-50"
        style={{ borderColor: 'rgba(27,55,104,0.15)', color: '#1B3768' }}>
        <Printer size={14} /> Stampa / Condividi
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold" style={{ color: '#1B3768' }}>Stampa o Condividi</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={16} style={{ color: 'rgba(27,55,104,0.4)' }} />
              </button>
            </div>

            {/* Sezioni da includere */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(27,55,104,0.5)' }}>
                Includi nel documento
              </p>
              {([
                ['elenco',   '📋 Elenco giornate con fasce orarie'],
                ['presenze', '👥 Foglio presenze'],
              ] as const).map(([key, label]) => (
                <label key={key}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition"
                  style={{ background: sections[key] ? 'rgba(30,184,229,0.08)' : 'rgba(27,55,104,0.03)', border: `1px solid ${sections[key] ? 'rgba(30,184,229,0.2)' : 'rgba(27,55,104,0.08)'}` }}>
                  <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: sections[key] ? '#1EB8E5' : 'white', border: sections[key] ? 'none' : '1.5px solid rgba(27,55,104,0.25)' }}>
                    {sections[key] && <Check size={10} className="text-white" />}
                  </div>
                  <span className="text-sm" style={{ color: '#1B3768' }}>{label}</span>
                  <input type="checkbox" checked={sections[key]} onChange={() => toggle(key)} className="sr-only" />
                </label>
              ))}
            </div>

            {/* Azioni */}
            <div className="space-y-2">
              <button onClick={handlePrint}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
                style={{ background: '#1B3768' }}>
                <Printer size={15} /> Stampa / Salva PDF
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" style={{ borderColor: 'rgba(27,55,104,0.1)' }} />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-2 text-xs" style={{ color: 'rgba(27,55,104,0.4)' }}>oppure</span>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="email@esempio.it"
                  className="flex-1 text-sm rounded-xl px-3 py-2 border focus:outline-none"
                  style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}
                />
                <button onClick={handleSendEmail} disabled={sending || sent}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white transition"
                  style={{ background: sent ? '#22c55e' : sending ? 'rgba(30,184,229,0.5)' : '#1EB8E5' }}>
                  <Mail size={13} />
                  {sent ? 'Inviato!' : sending ? '...' : 'Invia'}
                </button>
              </div>
              {emailError && (
                <p className="text-xs text-red-600 mt-1">{emailError}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
