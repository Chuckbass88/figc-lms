'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle, ChevronRight } from 'lucide-react'
import { calcolaDateCorso, formatGiornoPreview } from '@/lib/template-utils'
import type { CourseTemplate } from '@/lib/types'

interface Props {
  corsoId: string
  corsoHasEventi: boolean
  onClose: () => void
  onDone: () => void
}

type Step = 'scegli' | 'configura' | 'conferma'

interface TemplateConGiorni extends CourseTemplate {
  _giorniCount?: number
}

export default function ApplicaTemplateModal({ corsoId, corsoHasEventi, onClose, onDone }: Props) {
  const [step, setStep] = useState<Step>('scegli')
  const [templates, setTemplates] = useState<TemplateConGiorni[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateConGiorni | null>(null)
  const [startDate, setStartDate] = useState('')
  const [skipSabato, setSkipSabato] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/course-templates')
      .then(r => r.json())
      .then(j => setTemplates(j.templates ?? []))
      .catch(() => null)
  }, [])

  const nGiorni = selectedTemplate?._giorniCount ?? selectedTemplate?.parametri?.durata_giorni ?? 0

  const previewDates: string[] = (() => {
    if (!selectedTemplate || !startDate || nGiorni === 0) return []
    try {
      return calcolaDateCorso(startDate, Math.min(nGiorni, 8), { skipSabato }).map(formatGiornoPreview)
    } catch {
      return []
    }
  })()

  async function handleApply() {
    if (!selectedTemplate || !startDate) { setError('Seleziona template e data inizio'); return }
    setApplying(true); setError(null)
    const res = await fetch('/api/template/applica', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: selectedTemplate.id,
        corso_id: corsoId,
        start_date: startDate,
        skip_sabato: skipSabato,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Errore'); setApplying(false); return }
    setApplying(false)
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold" style={{ color: '#1B3768' }}>Applica template</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(27,55,104,0.45)' }}>
              {step === 'scegli' ? 'Passo 1 di 3 — Scegli template'
                : step === 'configura' ? 'Passo 2 di 3 — Configura date'
                : 'Passo 3 di 3 — Conferma'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"
            style={{ color: 'rgba(27,55,104,0.4)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">

          {/* Step 1 — Scegli template */}
          {step === 'scegli' && (
            <div className="space-y-2">
              {templates.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Nessun template disponibile</p>
              )}
              {templates.map(t => (
                <button key={t.id} onClick={() => setSelectedTemplate(t)}
                  className="w-full text-left px-4 py-3 rounded-xl border transition"
                  style={{
                    borderColor: selectedTemplate?.id === t.id ? '#1EB8E5' : 'rgba(27,55,104,0.12)',
                    background: selectedTemplate?.id === t.id ? 'rgba(30,184,229,0.06)' : 'white',
                  }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: '#1B3768' }}>{t.nome}</span>
                    {t.tipologia && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(27,55,104,0.06)', color: 'rgba(27,55,104,0.6)' }}>
                        {t.tipologia}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'rgba(27,55,104,0.45)' }}>
                    {t.struttura_tipo === 'moduli' ? 'Struttura: moduli' : 'Struttura: giorni'}
                    {' · '}
                    {t.parametri?.tipo_corso ?? 'centrale'}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Step 2 — Configura date */}
          {step === 'configura' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'rgba(27,55,104,0.6)' }}>
                  Data inizio corso *
                </label>
                <input type="date" value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-xl px-3 py-2 text-sm border bg-white focus:outline-none focus:ring-2"
                  style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768', '--tw-ring-color': '#1EB8E5' } as React.CSSProperties}
                />
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="skip-dom" checked disabled
                  className="rounded" style={{ accentColor: '#1B3768' }} />
                <label htmlFor="skip-dom" className="text-sm" style={{ color: 'rgba(27,55,104,0.5)' }}>
                  Salta domenica (sempre attivo)
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="skip-sab" checked={skipSabato}
                  onChange={e => setSkipSabato(e.target.checked)}
                  className="rounded" style={{ accentColor: '#1B3768' }} />
                <label htmlFor="skip-sab" className="text-sm cursor-pointer" style={{ color: '#1B3768' }}>
                  Salta sabato
                </label>
              </div>

              {previewDates.length > 0 && (
                <div className="rounded-xl p-3 space-y-1.5"
                  style={{ background: 'rgba(27,55,104,0.04)', border: '1px solid rgba(27,55,104,0.08)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#1B3768' }}>Anteprima</p>
                  {previewDates.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-16 font-medium" style={{ color: 'rgba(27,55,104,0.5)' }}>
                        Giorno {i + 1}
                      </span>
                      <ChevronRight size={10} style={{ color: 'rgba(27,55,104,0.3)' }} />
                      <span style={{ color: '#1B3768' }}>{d}</span>
                    </div>
                  ))}
                  {nGiorni > 8 && (
                    <p className="text-xs mt-1" style={{ color: 'rgba(27,55,104,0.4)' }}>
                      ...e altri {nGiorni - 8} giorni
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Conferma */}
          {step === 'conferma' && (
            <div className="space-y-4">
              {corsoHasEventi && (
                <div className="rounded-xl px-4 py-3 flex items-start gap-2.5"
                  style={{ background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9A3412' }}>
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Il programma e il calendario esistenti verranno sostituiti.</p>
                    <p className="text-xs mt-0.5">Questa operazione non è reversibile.</p>
                  </div>
                </div>
              )}
              <div className="rounded-xl p-4 space-y-2"
                style={{ background: 'rgba(27,55,104,0.04)', border: '1px solid rgba(27,55,104,0.08)' }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'rgba(27,55,104,0.5)' }}>Template</span>
                  <span className="font-semibold" style={{ color: '#1B3768' }}>{selectedTemplate?.nome}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'rgba(27,55,104,0.5)' }}>Inizio</span>
                  <span className="font-semibold" style={{ color: '#1B3768' }}>
                    {startDate ? new Date(startDate + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'rgba(27,55,104,0.5)' }}>Giorni</span>
                  <span className="font-semibold" style={{ color: '#1B3768' }}>{nGiorni}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'rgba(27,55,104,0.5)' }}>Salta sabato</span>
                  <span className="font-semibold" style={{ color: '#1B3768' }}>{skipSabato ? 'Sì' : 'No'}</span>
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          {step !== 'scegli' && (
            <button onClick={() => setStep(step === 'conferma' ? 'configura' : 'scegli')}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition"
              style={{ background: 'rgba(27,55,104,0.08)', color: '#1B3768' }}>
              ← Indietro
            </button>
          )}

          {step === 'scegli' && (
            <button
              onClick={() => { if (selectedTemplate) setStep('configura') }}
              disabled={!selectedTemplate}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition ${!selectedTemplate ? 'opacity-40 cursor-not-allowed' : ''}`}
              style={{ background: '#1EB8E5' }}>
              Avanti →
            </button>
          )}
          {step === 'configura' && (
            <button
              onClick={() => { if (startDate) setStep('conferma') }}
              disabled={!startDate}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition ${!startDate ? 'opacity-40 cursor-not-allowed' : ''}`}
              style={{ background: '#1EB8E5' }}>
              Avanti →
            </button>
          )}
          {step === 'conferma' && (
            <button onClick={handleApply} disabled={applying}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition"
              style={{ background: applying ? 'rgba(30,184,229,0.5)' : '#1EB8E5' }}>
              {applying ? 'Generazione...' : 'Genera programma →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
