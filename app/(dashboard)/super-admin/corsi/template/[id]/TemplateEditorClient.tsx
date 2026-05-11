'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react'
import GiorniEditor from '@/components/template/GiorniEditor'
import ModuliEditor from '@/components/template/ModuliEditor'
import type { CourseTemplateCompleto, TemplateGiorno, TemplateModulo, Area } from '@/lib/types'
import { TIPOLOGIE_CORSO } from '@/lib/tipologie-corso'

interface Props {
  template: CourseTemplateCompleto
  aree: Area[]
}

export default function TemplateEditorClient({ template, aree }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [nome, setNome] = useState(template.nome)
  const [tipologia, setTipologia] = useState(template.tipologia ?? '')
  const [tipoCorsoProp, setTipoCorso] = useState<string>(
    (template.parametri as { tipo_corso?: string })?.tipo_corso ?? 'centrale'
  )
  const [strutturaTipo, setStrutturaTipo] = useState<'giorni' | 'moduli' | 'calendario'>(template.struttura_tipo)
  const [materialiTags, setMaterialiTags] = useState<string[]>(template.materiali_tags ?? [])
  const [quizTags, setQuizTags] = useState<string[]>(template.quiz_tags ?? [])
  const [warnSwitch, setWarnSwitch] = useState(false)

  const [giorni, setGiorni] = useState<TemplateGiorno[]>(template.giorni ?? [])
  const [moduli, setModuli] = useState<TemplateModulo[]>(template.moduli ?? [])

  const inp = "w-full rounded-xl px-3 py-2 text-sm border bg-white focus:outline-none focus:ring-2"
  const inpStyle = { borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768', '--tw-ring-color': '#1EB8E5' } as React.CSSProperties
  const cardStyle = { background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,55,104,0.1)' }

  async function handleSave() {
    if (!nome.trim()) { setError('Il nome è obbligatorio'); return }
    setSaving(true); setError(null)
    const res = await fetch(`/api/template/${template.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome,
        tipologia: tipologia || null,
        struttura_tipo: strutturaTipo,
        materiali_tags: materialiTags,
        quiz_tags: quizTags,
        parametri: { ...template.parametri, tipo_corso: tipoCorsoProp },
      }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Errore'); setSaving(false); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  async function handleSwitchStruttura(to: 'giorni' | 'moduli') {
    const hasData = strutturaTipo === 'giorni' ? giorni.length > 0 : moduli.length > 0
    if (hasData) { setWarnSwitch(true); return }
    setStrutturaTipo(to)
    await fetch(`/api/template/${template.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ struttura_tipo: to }),
    })
  }

  function toggleTag(list: string[], setList: (v: string[]) => void, tag: string) {
    setList(list.includes(tag) ? list.filter(t => t !== tag) : [...list, tag])
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/super-admin/corsi/template"
            className="flex items-center gap-1.5 text-sm mb-2 transition"
            style={{ color: 'rgba(27,55,104,0.5)' }}>
            <ArrowLeft size={14} /> Template Corsi
          </Link>
          <h1 className="text-xl font-bold" style={{ color: '#1B3768' }}>{nome || 'Nuovo template'}</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-sm transition"
          style={{ backgroundColor: saved ? '#22c55e' : saving ? 'rgba(30,184,229,0.5)' : '#1EB8E5' }}
        >
          <Save size={14} />
          {saved ? 'Salvato!' : saving ? 'Salvataggio...' : 'Salva'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-700">{error}</div>
      )}

      {/* Blocco 1 — Informazioni base */}
      <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
        <h2 className="text-sm font-semibold" style={{ color: '#1B3768' }}>Informazioni base</h2>

        <input type="text" placeholder="Nome template *" value={nome}
          onChange={e => setNome(e.target.value)}
          className={inp} style={inpStyle} />

        <div className="grid grid-cols-2 gap-3">
          <select value={tipologia} onChange={e => setTipologia(e.target.value)}
            className={inp}
            style={{ ...inpStyle, color: tipologia ? '#1B3768' : 'rgba(27,55,104,0.4)' }}>
            <option value="">Tipologia corso</option>
            {TIPOLOGIE_CORSO.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <div className="flex gap-2">
            {(['centrale', 'periferico'] as const).map(t => (
              <button key={t} type="button"
                onClick={() => setTipoCorso(t)}
                className="flex-1 py-2 rounded-xl text-sm font-medium capitalize transition"
                style={{
                  background: tipoCorsoProp === t ? '#1B3768' : 'rgba(27,55,104,0.08)',
                  color: tipoCorsoProp === t ? 'white' : '#1B3768',
                }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Blocco 2 — Struttura calendario */}
      <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: '#1B3768' }}>Struttura calendario</h2>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(27,55,104,0.06)' }}>
            {(['giorni', 'moduli'] as const).map(s => (
              <button key={s} type="button"
                onClick={() => { if (s !== strutturaTipo) handleSwitchStruttura(s) }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition"
                style={{
                  background: strutturaTipo === s ? '#1B3768' : 'transparent',
                  color: strutturaTipo === s ? 'white' : 'rgba(27,55,104,0.5)',
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {warnSwitch && (
          <div className="rounded-xl px-4 py-3 text-sm flex items-start gap-2"
            style={{ background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9A3412' }}>
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Cambiare struttura eliminerà i dati esistenti.</p>
              <p className="mt-1 text-xs">Assicurati di voler procedere.</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setWarnSwitch(false)}
                  className="px-3 py-1 rounded-lg text-xs font-medium"
                  style={{ background: 'rgba(154,56,18,0.1)', color: '#9A3412' }}>
                  Annulla
                </button>
                <button onClick={async () => {
                  const to = strutturaTipo === 'giorni' ? 'moduli' : 'giorni'
                  setStrutturaTipo(to)
                  setWarnSwitch(false)
                  await fetch(`/api/template/${template.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ struttura_tipo: to }),
                  })
                }}
                  className="px-3 py-1 rounded-lg text-xs font-medium text-white"
                  style={{ background: '#9A3412' }}>
                  Procedi
                </button>
              </div>
            </div>
          </div>
        )}

        {strutturaTipo === 'giorni' ? (
          <GiorniEditor
            templateId={template.id}
            giorni={giorni}
            aree={aree}
            onGiorniChange={setGiorni}
          />
        ) : (
          <ModuliEditor
            templateId={template.id}
            moduli={moduli}
            aree={aree}
            onModuliChange={setModuli}
          />
        )}
      </div>

      {/* Blocco 3 — Paniere materiali */}
      <div className="rounded-2xl p-5 space-y-3" style={cardStyle}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#1B3768' }}>Tipologie materiali suggeriti</h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(27,55,104,0.45)' }}>
            I file dell&apos;archivio con queste tipologie verranno proposti automaticamente
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TIPOLOGIE_CORSO.map(t => (
            <button key={t} type="button"
              onClick={() => toggleTag(materialiTags, setMaterialiTags, t)}
              className="px-3 py-1 rounded-full text-xs font-medium transition"
              style={{
                background: materialiTags.includes(t) ? '#1EB8E5' : 'rgba(27,55,104,0.06)',
                color: materialiTags.includes(t) ? 'white' : 'rgba(27,55,104,0.6)',
                border: materialiTags.includes(t) ? 'none' : '1px solid rgba(27,55,104,0.1)',
              }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Blocco 4 — Paniere esami */}
      <div className="rounded-2xl p-5 space-y-3" style={cardStyle}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: '#1B3768' }}>Tipologie esami suggeriti</h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(27,55,104,0.45)' }}>
            I quiz della libreria con queste tipologie verranno proposti automaticamente
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TIPOLOGIE_CORSO.map(t => (
            <button key={t} type="button"
              onClick={() => toggleTag(quizTags, setQuizTags, t)}
              className="px-3 py-1 rounded-full text-xs font-medium transition"
              style={{
                background: quizTags.includes(t) ? '#1B3768' : 'rgba(27,55,104,0.06)',
                color: quizTags.includes(t) ? 'white' : 'rgba(27,55,104,0.6)',
                border: quizTags.includes(t) ? 'none' : '1px solid rgba(27,55,104,0.1)',
              }}>
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
