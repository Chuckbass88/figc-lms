'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Minus } from 'lucide-react'

export default function NuovoTemplatePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    tipologia: '',
    durata_giorni: 5,
    tipo_corso: 'centrale' as 'centrale' | 'periferico',
    giorni_settimana: ['lun', 'mar', 'mer', 'gio', 'ven'],
    materie: [{ nome: '', ore: 2 }],
    fasce: [{ inizio: '09:00', fine: '11:00', materia: '' }],
  })

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const parametri = {
      durata_giorni: form.durata_giorni,
      tipo_corso: form.tipo_corso,
      materie: form.materie,
      calendario: {
        giorni_settimana: form.giorni_settimana,
        fasce_tipo: form.fasce,
      },
    }
    const res = await fetch('/api/course-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: form.nome, tipologia: form.tipologia, parametri }),
    })
    setSaving(false)
    if (res.ok) router.push('/super-admin/corsi/template')
  }

  return (
    <form onSubmit={handleSave} className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold" style={{ color: '#1B3768' }}>Nuovo Template Corso</h1>

      {/* Dati base */}
      <div className="rounded-2xl p-5 space-y-4"
        style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(27,55,104,0.1)' }}>
        <h2 className="text-sm font-semibold" style={{ color: '#1B3768' }}>Informazioni generali</h2>
        <input type="text" placeholder="Nome template *" required
          value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
          className="w-full rounded-xl px-3 py-2 text-sm border"
          style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }} />
        <div className="grid grid-cols-2 gap-3">
          <input type="text" placeholder="Tipologia (es. UEFA A)"
            value={form.tipologia} onChange={e => setForm(p => ({ ...p, tipologia: e.target.value }))}
            className="rounded-xl px-3 py-2 text-sm border"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }} />
          <input type="number" min={1} max={365} placeholder="Durata (giorni)"
            value={form.durata_giorni} onChange={e => setForm(p => ({ ...p, durata_giorni: +e.target.value }))}
            className="rounded-xl px-3 py-2 text-sm border"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }} />
        </div>
        <div className="flex gap-3">
          {(['centrale', 'periferico'] as const).map(t => (
            <button key={t} type="button"
              onClick={() => setForm(p => ({ ...p, tipo_corso: t }))}
              className="px-4 py-2 rounded-xl text-sm font-medium capitalize"
              style={{
                background: form.tipo_corso === t ? '#1B3768' : 'rgba(27,55,104,0.08)',
                color: form.tipo_corso === t ? 'white' : '#1B3768',
              }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Materie */}
      <div className="rounded-2xl p-5 space-y-3"
        style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(27,55,104,0.1)' }}>
        <h2 className="text-sm font-semibold" style={{ color: '#1B3768' }}>Materie</h2>
        {form.materie.map((m, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input type="text" placeholder="Nome materia" value={m.nome}
              onChange={e => setForm(p => ({
                ...p,
                materie: p.materie.map((x, j) => j === i ? { ...x, nome: e.target.value } : x)
              }))}
              className="flex-1 rounded-xl px-3 py-2 text-sm border"
              style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }} />
            <input type="number" min={1} max={100} placeholder="Ore" value={m.ore}
              onChange={e => setForm(p => ({
                ...p,
                materie: p.materie.map((x, j) => j === i ? { ...x, ore: +e.target.value } : x)
              }))}
              className="w-20 rounded-xl px-3 py-2 text-sm border"
              style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }} />
            <button type="button" onClick={() => setForm(p => ({
              ...p, materie: p.materie.filter((_, j) => j !== i)
            }))} className="p-1" style={{ color: 'rgba(27,55,104,0.4)' }}>
              <Minus size={16} />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setForm(p => ({
          ...p, materie: [...p.materie, { nome: '', ore: 2 }]
        }))} className="flex items-center gap-1 text-sm"
          style={{ color: '#0891B2' }}>
          <Plus size={15} /> Aggiungi materia
        </button>
      </div>

      {/* Fasce orarie tipo */}
      <div className="rounded-2xl p-5 space-y-3"
        style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(27,55,104,0.1)' }}>
        <h2 className="text-sm font-semibold" style={{ color: '#1B3768' }}>Fasce orarie tipo</h2>
        {form.fasce.map((f, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input type="time" value={f.inizio}
              onChange={e => setForm(p => ({
                ...p, fasce: p.fasce.map((x, j) => j === i ? { ...x, inizio: e.target.value } : x)
              }))}
              className="w-28 rounded-xl px-3 py-2 text-sm border"
              style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }} />
            <span style={{ color: 'rgba(27,55,104,0.4)' }}>→</span>
            <input type="time" value={f.fine}
              onChange={e => setForm(p => ({
                ...p, fasce: p.fasce.map((x, j) => j === i ? { ...x, fine: e.target.value } : x)
              }))}
              className="w-28 rounded-xl px-3 py-2 text-sm border"
              style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }} />
            <input type="text" placeholder="Materia" value={f.materia}
              onChange={e => setForm(p => ({
                ...p, fasce: p.fasce.map((x, j) => j === i ? { ...x, materia: e.target.value } : x)
              }))}
              className="flex-1 rounded-xl px-3 py-2 text-sm border"
              style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }} />
            <button type="button" onClick={() => setForm(p => ({
              ...p, fasce: p.fasce.filter((_, j) => j !== i)
            }))} className="p-1" style={{ color: 'rgba(27,55,104,0.4)' }}>
              <Minus size={16} />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setForm(p => ({
          ...p, fasce: [...p.fasce, { inizio: '', fine: '', materia: '' }]
        }))} className="flex items-center gap-1 text-sm" style={{ color: '#0891B2' }}>
          <Plus size={15} /> Aggiungi fascia
        </button>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(27,55,104,0.08)', color: '#1B3768' }}>
          Annulla
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: saving ? 'rgba(8,145,178,0.5)' : '#0891B2' }}>
          {saving ? 'Salvataggio...' : 'Salva template'}
        </button>
      </div>
    </form>
  )
}
