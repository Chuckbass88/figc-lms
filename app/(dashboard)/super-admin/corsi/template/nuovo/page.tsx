'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Minus, ArrowLeft, Clock } from 'lucide-react'
import { TIPOLOGIE_CORSO } from '@/lib/tipologie-corso'

interface Materia { nome: string; ore: number }
interface Fascia { inizio: string; fine: string; materia: string }

export default function NuovoTemplatePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    nome: '',
    tipologia: '',
    durata_giorni: '' as string | number,  // stringa per evitare zero davanti
    tipo_corso: 'centrale' as 'centrale' | 'periferico',
    materie: [{ nome: '', ore: '' as string | number }] as Materia[],
    fasce: [{ inizio: '09:00', fine: '11:00', materia: '' }] as Fascia[],
  })

  // Totale ore materie
  const totaleOre = form.materie.reduce((acc, m) => acc + (Number(m.ore) || 0), 0)

  function updateMateria(i: number, field: keyof Materia, value: string | number) {
    setForm(p => ({ ...p, materie: p.materie.map((m, j) => j === i ? { ...m, [field]: value } : m) }))
  }
  function updateFascia(i: number, field: keyof Fascia, value: string) {
    setForm(p => ({ ...p, fasce: p.fasce.map((f, j) => j === i ? { ...f, [field]: value } : f) }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validazione fasce orarie: filtra righe vuote, valida quelle presenti
    const fasceValide = form.fasce.filter(f => f.inizio && f.fine)
    for (const f of fasceValide) {
      if (f.inizio >= f.fine) {
        setError(`Fascia oraria non valida: l'orario di fine deve essere dopo l'inizio (${f.inizio} → ${f.fine})`)
        return
      }
    }

    const materieValide = form.materie.filter(m => m.nome.trim())

    setSaving(true)
    const parametri = {
      durata_giorni: Number(form.durata_giorni) || 1,
      tipo_corso: form.tipo_corso,
      materie: materieValide.map(m => ({ nome: m.nome, ore: Number(m.ore) || 0 })),
      calendario: {
        fasce_tipo: fasceValide,
      },
    }

    try {
      const res = await fetch('/api/course-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: form.nome, tipologia: form.tipologia, parametri }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error ?? 'Errore nel salvataggio. Riprova.')
        setSaving(false)
        return
      }
      router.push('/super-admin/corsi/template')
    } catch {
      setError('Errore di rete. Controlla la connessione.')
      setSaving(false)
    }
  }

  const inputCls = "w-full rounded-xl px-3 py-2 text-sm border bg-white focus:outline-none focus:ring-2"
  const inputStyle = { borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768', '--tw-ring-color': '#0891B2' } as React.CSSProperties

  return (
    <form onSubmit={handleSave} className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header con back */}
      <div>
        <Link href="/super-admin/corsi/template" className="flex items-center gap-1.5 text-sm mb-3 transition"
          style={{ color: 'rgba(27,55,104,0.5)' }}>
          <ArrowLeft size={14} /> Template Corsi
        </Link>
        <h1 className="text-xl font-bold" style={{ color: '#1B3768' }}>Nuovo Template Corso</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(27,55,104,0.5)' }}>
          Il template definisce la struttura tipo di un corso: materie, ore e fasce orarie giornaliere.
        </p>
      </div>

      {/* Errore */}
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-700">
          {error}
        </div>
      )}

      {/* Dati base */}
      <div className="rounded-2xl p-5 space-y-4"
        style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,55,104,0.1)' }}>
        <h2 className="text-sm font-semibold" style={{ color: '#1B3768' }}>Informazioni generali</h2>

        <input type="text" placeholder="Nome template *" required
          value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
          className={inputCls} style={inputStyle} />

        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.tipologia} onChange={e => setForm(p => ({ ...p, tipologia: e.target.value }))}
            className={inputCls} style={{ ...inputStyle, color: form.tipologia ? '#1B3768' : 'rgba(27,55,104,0.4)' }}>
            <option value="">Tipologia corso</option>
            {TIPOLOGIE_CORSO.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'rgba(27,55,104,0.6)' }}>
              Durata totale (giorni)
            </label>
            <input
              type="number" min={1} max={365} placeholder="es. 5"
              value={form.durata_giorni}
              onChange={e => setForm(p => ({ ...p, durata_giorni: e.target.value }))}
              className={inputCls} style={inputStyle}
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'rgba(27,55,104,0.6)' }}>Tipo corso</p>
          <div className="flex gap-3">
            {(['centrale', 'periferico'] as const).map(t => (
              <button key={t} type="button"
                onClick={() => setForm(p => ({ ...p, tipo_corso: t }))}
                className="px-4 py-2 rounded-xl text-sm font-medium capitalize transition"
                style={{
                  background: form.tipo_corso === t ? '#1B3768' : 'rgba(27,55,104,0.08)',
                  color: form.tipo_corso === t ? 'white' : '#1B3768',
                }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Materie */}
      <div className="rounded-2xl p-5 space-y-3"
        style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,55,104,0.1)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: '#1B3768' }}>Materie</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(27,55,104,0.45)' }}>
              Inserisci le ore per ogni materia — si riferiscono alle ore totali del corso
            </p>
          </div>
          {totaleOre > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold"
              style={{ background: 'rgba(8,145,178,0.1)', color: '#0891B2' }}>
              <Clock size={12} /> {totaleOre} ore totali
            </div>
          )}
        </div>

        {form.materie.map((m, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input type="text" placeholder="Nome materia" value={m.nome}
              onChange={e => updateMateria(i, 'nome', e.target.value)}
              className="flex-1 rounded-xl px-3 py-2 text-sm border bg-white focus:outline-none"
              style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }} />
            <div className="w-24">
              <input
                type="number" min={1} max={500} placeholder="Ore"
                value={m.ore}
                onChange={e => updateMateria(i, 'ore', e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm border bg-white focus:outline-none"
                style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}
              />
            </div>
            {form.materie.length > 1 && (
              <button type="button" onClick={() => setForm(p => ({ ...p, materie: p.materie.filter((_, j) => j !== i) }))}
                className="p-1.5 rounded-lg transition hover:bg-red-50" style={{ color: 'rgba(27,55,104,0.4)' }}>
                <Minus size={15} />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => setForm(p => ({ ...p, materie: [...p.materie, { nome: '', ore: '' as any }] }))}
          className="flex items-center gap-1 text-sm font-medium" style={{ color: '#0891B2' }}>
          <Plus size={15} /> Aggiungi materia
        </button>
      </div>

      {/* Fasce orarie */}
      <div className="rounded-2xl p-5 space-y-3"
        style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,55,104,0.1)' }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#1B3768' }}>Fasce orarie tipo</h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(27,55,104,0.45)' }}>
            Orario giornaliero tipo — verrà replicato per ogni giornata del corso
          </p>
        </div>
        {form.fasce.map((f, i) => (
          <div key={i} className="flex gap-2 items-center flex-wrap">
            <div className="flex items-center gap-1.5">
              <input type="time" value={f.inizio}
                onChange={e => updateFascia(i, 'inizio', e.target.value)}
                className="w-28 rounded-xl px-3 py-2 text-sm border bg-white focus:outline-none"
                style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }} />
              <span style={{ color: 'rgba(27,55,104,0.35)' }}>→</span>
              <input type="time" value={f.fine}
                onChange={e => updateFascia(i, 'fine', e.target.value)}
                className="w-28 rounded-xl px-3 py-2 text-sm border bg-white focus:outline-none"
                style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }} />
            </div>
            <input type="text" placeholder="Materia / Descrizione" value={f.materia}
              onChange={e => updateFascia(i, 'materia', e.target.value)}
              className="flex-1 min-w-[120px] rounded-xl px-3 py-2 text-sm border bg-white focus:outline-none"
              style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }} />
            {form.fasce.length > 1 && (
              <button type="button" onClick={() => setForm(p => ({ ...p, fasce: p.fasce.filter((_, j) => j !== i) }))}
                className="p-1.5 rounded-lg transition hover:bg-red-50" style={{ color: 'rgba(27,55,104,0.4)' }}>
                <Minus size={15} />
              </button>
            )}
          </div>
        ))}
        <button type="button"
          onClick={() => setForm(p => ({ ...p, fasce: [...p.fasce, { inizio: '', fine: '', materia: '' }] }))}
          className="flex items-center gap-1 text-sm font-medium" style={{ color: '#0891B2' }}>
          <Plus size={15} /> Aggiungi fascia
        </button>
      </div>

      {/* Azioni */}
      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium transition hover:opacity-80"
          style={{ background: 'rgba(27,55,104,0.08)', color: '#1B3768' }}>
          Annulla
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition"
          style={{ background: saving ? 'rgba(30,184,229,0.5)' : '#1EB8E5' }}>
          {saving ? 'Salvataggio...' : 'Salva template'}
        </button>
      </div>
    </form>
  )
}
