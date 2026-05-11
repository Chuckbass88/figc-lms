'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TIPOLOGIE_CORSO } from '@/lib/tipologie-corso'

export default function NuovoTemplatePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    nome: '',
    tipologia: '',
    tipo_corso: 'centrale' as 'centrale' | 'periferico',
    struttura_tipo: 'giorni' as 'giorni' | 'moduli' | 'calendario',
  })

  const inp = "w-full rounded-xl px-3 py-2 text-sm border bg-white focus:outline-none focus:ring-2"
  const inpStyle = { borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768', '--tw-ring-color': '#1EB8E5' } as React.CSSProperties

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { setError('Il nome è obbligatorio'); return }
    setSaving(true); setError(null)

    const res = await fetch('/api/course-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: form.nome,
        tipologia: form.tipologia || null,
        struttura_tipo: form.struttura_tipo,
        materiali_tags: [],
        quiz_tags: [],
        parametri: { tipo_corso: form.tipo_corso },
      }),
    })

    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Errore'); setSaving(false); return }

    router.push(`/super-admin/corsi/template/${json.template.id}`)
  }

  return (
    <form onSubmit={handleSave} className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/super-admin/corsi/template"
          className="flex items-center gap-1.5 text-sm mb-3 transition"
          style={{ color: 'rgba(27,55,104,0.5)' }}>
          <ArrowLeft size={14} /> Template Corsi
        </Link>
        <h1 className="text-xl font-bold" style={{ color: '#1B3768' }}>Nuovo Template Corso</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(27,55,104,0.5)' }}>
          Crea il template, poi aggiungerai giorni e fasce orarie nell&apos;editor.
        </p>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-700">{error}</div>
      )}

      <div className="rounded-2xl p-5 space-y-4"
        style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,55,104,0.1)' }}>
        <h2 className="text-sm font-semibold" style={{ color: '#1B3768' }}>Informazioni base</h2>

        <input type="text" placeholder="Nome template *" required
          value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
          className={inp} style={inpStyle} />

        <div className="grid grid-cols-2 gap-3">
          <select value={form.tipologia} onChange={e => setForm(p => ({ ...p, tipologia: e.target.value }))}
            className={inp}
            style={{ ...inpStyle, color: form.tipologia ? '#1B3768' : 'rgba(27,55,104,0.4)' }}>
            <option value="">Tipologia corso</option>
            {TIPOLOGIE_CORSO.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <div className="flex gap-2">
            {(['centrale', 'periferico'] as const).map(t => (
              <button key={t} type="button"
                onClick={() => setForm(p => ({ ...p, tipo_corso: t }))}
                className="flex-1 py-2 rounded-xl text-sm font-medium capitalize transition"
                style={{
                  background: form.tipo_corso === t ? '#1B3768' : 'rgba(27,55,104,0.08)',
                  color: form.tipo_corso === t ? 'white' : '#1B3768',
                }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'rgba(27,55,104,0.6)' }}>Struttura</p>
          <div className="flex gap-2">
            {(['giorni', 'moduli', 'calendario'] as const).map(s => (
              <button key={s} type="button"
                onClick={() => setForm(p => ({ ...p, struttura_tipo: s }))}
                className="flex-1 py-2 rounded-xl text-sm font-medium capitalize transition"
                style={{
                  background: form.struttura_tipo === s ? '#1B3768' : 'rgba(27,55,104,0.08)',
                  color: form.struttura_tipo === s ? 'white' : '#1B3768',
                }}>
                {s === 'giorni' ? 'Giorni sequenziali' : s === 'moduli' ? 'Moduli + Giorni' : 'Calendario'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(27,55,104,0.08)', color: '#1B3768' }}>
          Annulla
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition"
          style={{ background: saving ? 'rgba(30,184,229,0.5)' : '#1EB8E5' }}>
          {saving ? 'Creazione...' : 'Crea e continua →'}
        </button>
      </div>
    </form>
  )
}
