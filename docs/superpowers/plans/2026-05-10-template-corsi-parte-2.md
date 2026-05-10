# Template Corsi — Parte 2: Apply Template + Calendar + PDF + Email

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Prerequisito:** Parte 1 deve essere completata (`docs/superpowers/plans/2026-05-10-template-corsi-parte-1.md`)

**Goal:** Implementare l'applicazione template ai corsi (genera `corso_eventi` + `program_blocks`), la vista calendario tabella settimanale (Lun-Sab, 4-5 sett/pagina) e l'export PDF con invio email.

**Architecture:** API `/api/template/applica` calcola date reali e popola DB. `CalendarioTabella` è un client component riutilizzato in super-admin, docente e studente (con feature diverse per ruolo). PDF generato con `@react-pdf/renderer` (già in uso). Email via `lib/email.ts` con Resend (già configurato) esteso per allegati.

**Tech Stack:** Next.js 15 App Router, Supabase, `@react-pdf/renderer`, Resend, Tailwind CSS v4

---

## File Structure

**Nuovi:**
- `app/api/template/applica/route.ts`
- `components/template/ApplicaTemplateModal.tsx`
- `components/corso/CalendarioTabella.tsx`
- `app/(dashboard)/super-admin/corsi/[id]/calendario/page.tsx`
- `app/(dashboard)/docente/corsi/[id]/calendario/page.tsx`
- `app/(dashboard)/studente/corsi/[id]/calendario/page.tsx`
- `app/api/corsi/[id]/calendario/route.ts`
- `app/api/corsi/[id]/calendario/pdf/route.tsx`
- `app/api/corsi/[id]/calendario/invia/route.ts`

**Modificati:**
- `app/(dashboard)/super-admin/corsi/[id]/page.tsx` — aggiunge tab Calendario + pulsante "Applica template"
- `app/(dashboard)/docente/corsi/[id]/page.tsx` — aggiunge tab Calendario
- `app/(dashboard)/studente/corsi/[id]/page.tsx` — aggiunge tab Calendario (link al PDF)
- `components/courses/CourseForm.tsx` — aggiunge sezione "Usa un template"

---

### Task 10: Apply Template API

**Files:**
- Create: `app/api/template/applica/route.ts`

- [ ] **Step 1: Crea la directory e il file**

```bash
mkdir -p app/api/template/applica
```

```typescript
// app/api/template/applica/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calcolaDateCorso, toSupabaseDate } from '@/lib/template-utils'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
  }

  const { template_id, corso_id, start_date, skip_sabato } = await req.json()
  if (!template_id || !corso_id || !start_date) {
    return NextResponse.json({ error: 'template_id, corso_id e start_date obbligatori' }, { status: 400 })
  }

  // 1. Fetch template completo
  const { data: template } = await supabase
    .from('course_templates').select('*').eq('id', template_id).single()
  if (!template) return NextResponse.json({ error: 'Template non trovato' }, { status: 404 })

  const { data: allGiorni } = await supabase
    .from('template_giorni').select('*').eq('template_id', template_id).order('numero')
  const giornoIds = (allGiorni ?? []).map(g => g.id)
  const { data: allFasce } = giornoIds.length > 0
    ? await supabase.from('template_fasce_orarie').select('*').in('giorno_id', giornoIds).order('ora_inizio')
    : { data: [] }

  const { data: allModuli } = await supabase
    .from('template_moduli').select('*').eq('template_id', template_id).order('numero')

  const fascePerGiorno = new Map<string, typeof allFasce>()
  ;(allFasce ?? []).forEach((f: Record<string, unknown>) => {
    const list = fascePerGiorno.get(f.giorno_id as string) ?? []
    list.push(f as never)
    fascePerGiorno.set(f.giorno_id as string, list)
  })

  const giorniWithFasce = (allGiorni ?? []).map(g => ({
    ...g,
    fasce: fascePerGiorno.get(g.id) ?? [],
  }))

  // 2. Calcola date reali
  const nGiorni = giorniWithFasce.length
  if (nGiorni === 0) return NextResponse.json({ error: 'Il template non ha giorni' }, { status: 400 })

  const dates = calcolaDateCorso(start_date, nGiorni, { skipSabato: skip_sabato ?? false })

  // 3. Elimina vecchi corso_eventi di questo corso (replace)
  await supabase.from('corso_eventi').delete().eq('corso_id', corso_id)

  // 4. Inserisci nuovi corso_eventi
  const eventiToInsert = giorniWithFasce.flatMap((giorno, idx) => {
    const data = dates[idx]
    if (!data) return []
    return (giorno.fasce ?? []).map((f: Record<string, unknown>) => ({
      corso_id,
      materia: f.materia as string,
      area_id: (f.area_id as string | null) ?? null,
      data: toSupabaseDate(data),
      ora_inizio: f.ora_inizio as string,
      ora_fine: f.ora_fine as string,
      note: (f.note as string | null) ?? null,
    }))
  })

  if (eventiToInsert.length > 0) {
    const { error: evErr } = await supabase.from('corso_eventi').insert(eventiToInsert)
    if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 })
  }

  // 5. Elimina vecchi program basati su template (se esiste tag "from_template")
  // Strategia: elimina programma con title "Programma" o creato da template precedente
  // Per semplicità: elimina tutti i programmi del corso e ricrea
  const { data: existingPrograms } = await supabase
    .from('course_programs').select('id').eq('course_id', corso_id)
  if (existingPrograms && existingPrograms.length > 0) {
    // Avvisa il client: esistono già programmi — la scelta di sostituire è già stata confermata dal modal
    await supabase.from('course_programs').delete()
      .in('id', existingPrograms.map(p => p.id))
  }

  // 6. Crea nuovo course_program
  const { data: newProgram, error: pErr } = await supabase
    .from('course_programs')
    .insert({
      course_id: corso_id,
      title: template.nome,
      created_by: user.id,
      visibility: 'private',
    })
    .select().single()

  if (pErr || !newProgram) return NextResponse.json({ error: pErr?.message ?? 'Errore programma' }, { status: 500 })

  // 7. Crea program_modules / program_days / program_blocks
  const strutturaTipo = (template.struttura_tipo as string) ?? 'giorni'

  if (strutturaTipo === 'moduli' && allModuli && allModuli.length > 0) {
    // Crea un module per ogni template_modulo
    const giorniPerModulo = new Map<string, typeof giorniWithFasce>()
    giorniWithFasce.forEach(g => {
      if (g.modulo_id) {
        const list = giorniPerModulo.get(g.modulo_id) ?? []
        list.push(g)
        giorniPerModulo.set(g.modulo_id, list)
      }
    })

    let globalDayIdx = 0
    for (const modulo of allModuli) {
      const { data: pMod, error: mErr } = await supabase
        .from('program_modules')
        .insert({ program_id: newProgram.id, title: modulo.titolo, type: 'module', order_index: modulo.numero - 1 })
        .select().single()
      if (mErr || !pMod) continue

      const giorni = giorniPerModulo.get(modulo.id) ?? []
      for (const giorno of giorni) {
        const data = dates[globalDayIdx++]
        if (!data) continue
        const { data: pDay, error: dErr } = await supabase
          .from('program_days')
          .insert({
            module_id: pMod.id, program_id: newProgram.id,
            title: giorno.titolo ?? `Giorno ${giorno.numero}`,
            day_date: toSupabaseDate(data),
            order_index: giorno.numero - 1,
          })
          .select().single()
        if (dErr || !pDay) continue

        const fasce = giorno.fasce ?? []
        if (fasce.length > 0) {
          await supabase.from('program_blocks').insert(
            fasce.map((f: Record<string, unknown>, i: number) => ({
              day_id: pDay.id, program_id: newProgram.id,
              title: f.materia as string,
              start_time: f.ora_inizio as string,
              end_time: f.ora_fine as string,
              order_index: i,
              is_break: false,
            }))
          )
        }
      }
    }
  } else {
    // struttura 'giorni': un solo modulo generico
    const { data: pMod, error: mErr } = await supabase
      .from('program_modules')
      .insert({ program_id: newProgram.id, title: 'Programma', type: 'block', order_index: 0 })
      .select().single()

    if (!mErr && pMod) {
      for (let i = 0; i < giorniWithFasce.length; i++) {
        const giorno = giorniWithFasce[i]
        const data = dates[i]
        if (!data) continue
        const { data: pDay, error: dErr } = await supabase
          .from('program_days')
          .insert({
            module_id: pMod.id, program_id: newProgram.id,
            title: giorno.titolo ?? `Giorno ${giorno.numero}`,
            day_date: toSupabaseDate(data),
            order_index: i,
          })
          .select().single()
        if (dErr || !pDay) continue

        const fasce = giorno.fasce ?? []
        if (fasce.length > 0) {
          await supabase.from('program_blocks').insert(
            fasce.map((f: Record<string, unknown>, j: number) => ({
              day_id: pDay.id, program_id: newProgram.id,
              title: f.materia as string,
              start_time: f.ora_inizio as string,
              end_time: f.ora_fine as string,
              order_index: j,
              is_break: false,
            }))
          )
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    eventi_creati: eventiToInsert.length,
    program_id: newProgram.id,
  })
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "template/applica" | head -10
```

Expected: 0 errori.

- [ ] **Step 3: Commit**

```bash
git add app/api/template/applica/route.ts
git commit -m "feat: POST /api/template/applica — genera corso_eventi e program_blocks da template"
```

---

### Task 11: ApplicaTemplateModal component

**Files:**
- Create: `components/template/ApplicaTemplateModal.tsx`

- [ ] **Step 1: Crea il componente**

```bash
mkdir -p components/template
```

```typescript
// components/template/ApplicaTemplateModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle, ChevronRight, Calendar } from 'lucide-react'
import { calcolaDateCorso, formatGiornoPreview } from '@/lib/template-utils'
import type { CourseTemplate } from '@/lib/types'

interface Props {
  corsoId: string
  corsoHasEventi: boolean   // true se il corso ha già corso_eventi
  onClose: () => void
  onDone: () => void
}

type Step = 'scegli' | 'configura' | 'conferma'

export default function ApplicaTemplateModal({ corsoId, corsoHasEventi, onClose, onDone }: Props) {
  const [step, setStep] = useState<Step>('scegli')
  const [templates, setTemplates] = useState<CourseTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<CourseTemplate | null>(null)
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

  // Calcola anteprima giorni
  const previewDates: string[] = (() => {
    if (!selectedTemplate || !startDate) return []
    const nGiorni = countGiorni(selectedTemplate)
    if (nGiorni === 0) return []
    try {
      return calcolaDateCorso(startDate, Math.min(nGiorni, 8), { skipSabato })
        .map(formatGiornoPreview)
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

  const btnPrimary = "px-4 py-2 rounded-xl text-white text-sm font-semibold transition"

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
                    {(t.parametri as { tipo_corso?: string })?.tipo_corso ?? 'centrale'}
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

              {/* Preview giorni */}
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
                  {selectedTemplate && countGiorni(selectedTemplate) > 8 && (
                    <p className="text-xs mt-1" style={{ color: 'rgba(27,55,104,0.4)' }}>
                      ...e altri {countGiorni(selectedTemplate) - 8} giorni
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
                  <span className="font-semibold" style={{ color: '#1B3768' }}>
                    {selectedTemplate ? countGiorni(selectedTemplate) : 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'rgba(27,55,104,0.5)' }}>Salta sabato</span>
                  <span className="font-semibold" style={{ color: '#1B3768' }}>{skipSabato ? 'Sì' : 'No'}</span>
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
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
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition`}
              style={{ background: applying ? 'rgba(30,184,229,0.5)' : '#1EB8E5' }}>
              {applying ? 'Generazione...' : 'Genera programma →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Conta i giorni top-level di un template (approssimativo — usa parametri.durata_giorni come fallback) */
function countGiorni(t: CourseTemplate): number {
  return (t.parametri as { durata_giorni?: number })?.durata_giorni ?? 0
}
```

**Nota:** `countGiorni` usa `parametri.durata_giorni` come fallback. Per avere il conteggio esatto, il modal deve ricevere il template completo con `giorni`. Aggiorna il `useEffect` per fetchare il conteggio giorni completo se necessario, oppure aggiungi il campo `_giorniCount` nel fetch della lista template:

```typescript
// In app/api/course-templates/route.ts aggiungi GET che torna lista:
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: templates } = await supabase.from('course_templates').select('*').order('nome')
  return NextResponse.json({ templates: templates ?? [] })
}
```

- [ ] **Step 2: Aggiungi GET a course-templates/route.ts**

Apri `app/api/course-templates/route.ts` e aggiungi il metodo GET mostrato sopra.

- [ ] **Step 3: Verifica TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "ApplicaTemplate\|course-templates" | head -10
```

Expected: 0 errori.

- [ ] **Step 4: Commit**

```bash
git add components/template/ApplicaTemplateModal.tsx app/api/course-templates/route.ts
git commit -m "feat: ApplicaTemplateModal — 3-step modal selezione+date+conferma + GET course-templates"
```

---

### Task 12: Integrazione nei corsi (tab + pulsante applica)

**Files:**
- Modify: `app/(dashboard)/super-admin/corsi/[id]/page.tsx`
- Modify: `app/(dashboard)/docente/corsi/[id]/page.tsx`
- Modify: `components/courses/CourseForm.tsx`

- [ ] **Step 1: Aggiungi tab Calendario e pulsante in super-admin corso page**

In `app/(dashboard)/super-admin/corsi/[id]/page.tsx`:

1. Aggiungi `CalendarCheck` agli import da lucide-react (già importato come `CalendarCheck` — verifica)
2. Aggiungi il link Calendario dopo il link Programma nella nav sezioni:

```tsx
{/* Dopo il link Programma */}
<Link href={`/super-admin/corsi/${id}/calendario`}
  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition">
  <CalendarCheck size={14} /> Calendario
</Link>
```

3. Aggiungi il pulsante "Applica template" all'inizio della sezione Panoramica (dopo la nav). Nella pagina, trova la prima section content e aggiungi un pulsante client. Poiché la pagina è un server component, usa un client component wrapper. Crea:

```typescript
// app/(dashboard)/super-admin/corsi/[id]/ApplicaTemplateBtn.tsx
'use client'

import { useState } from 'react'
import { LayoutTemplate } from 'lucide-react'
import ApplicaTemplateModal from '@/components/template/ApplicaTemplateModal'

interface Props {
  corsoId: string
  hasEventi: boolean
}

export default function ApplicaTemplateBtn({ corsoId, hasEventi }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition hover:bg-gray-50"
        style={{ borderColor: 'rgba(27,55,104,0.15)', color: '#1B3768' }}>
        <LayoutTemplate size={14} /> Applica template
      </button>

      {open && (
        <ApplicaTemplateModal
          corsoId={corsoId}
          corsoHasEventi={hasEventi}
          onClose={() => setOpen(false)}
          onDone={() => { setOpen(false); window.location.reload() }}
        />
      )}
    </>
  )
}
```

4. In `page.tsx`, importa `ApplicaTemplateBtn` e verifica se ci sono eventi:

```typescript
// Aggiungi alla sezione fetch Promise.all in page.tsx:
supabase.from('corso_eventi').select('id', { count: 'exact', head: true }).eq('corso_id', id),
```

e poi nella destructuring:
```typescript
const { count: eventiCount } = // dall'array Promise.all
```

5. Aggiungi `<ApplicaTemplateBtn corsoId={id} hasEventi={(eventiCount ?? 0) > 0} />` vicino al titolo del corso o nella sezione info corso.

- [ ] **Step 2: Aggiungi tab Calendario in docente corso page**

In `app/(dashboard)/docente/corsi/[id]/page.tsx`, aggiungi dopo il link Programma:

```tsx
<Link href={`/docente/corsi/${id}/calendario`}
  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition">
  <CalendarCheck size={14} /> Calendario
</Link>
```

Assicurati che `CalendarCheck` sia importato da lucide-react.

- [ ] **Step 3: Aggiungi sezione "Usa un template" in CourseForm**

In `components/courses/CourseForm.tsx`, dopo l'import di `createClient`, aggiungi:

```typescript
import { useState, useEffect } from 'react'  // già importato
import type { CourseTemplate } from '@/lib/types'
import ApplicaTemplateModal from '@/components/template/ApplicaTemplateModal'
```

All'interno del componente, aggiungi state e sezione collassabile prima del campo "nome":

```typescript
const [templates, setTemplates] = useState<CourseTemplate[]>([])
const [selectedTemplateId, setSelectedTemplateId] = useState('')
const [showTemplateSection, setShowTemplateSection] = useState(false)
const [newCorsoId, setNewCorsoId] = useState<string | null>(null)
const [showApplica, setShowApplica] = useState(false)

useEffect(() => {
  if (showTemplateSection && templates.length === 0) {
    fetch('/api/course-templates')
      .then(r => r.json())
      .then(j => setTemplates(j.templates ?? []))
  }
}, [showTemplateSection])
```

Prima del return della form, aggiungi la sezione collassabile:

```tsx
{/* Sezione template — solo per nuovo corso */}
{!isEdit && (
  <div className="mb-6 rounded-2xl border overflow-hidden"
    style={{ borderColor: 'rgba(27,55,104,0.12)' }}>
    <button type="button"
      onClick={() => setShowTemplateSection(!showTemplateSection)}
      className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition hover:bg-gray-50"
      style={{ color: '#1B3768' }}>
      <span>Usa un template (opzionale)</span>
      <span style={{ color: 'rgba(27,55,104,0.4)', fontSize: 12 }}>
        {showTemplateSection ? '▲' : '▼'}
      </span>
    </button>
    {showTemplateSection && (
      <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'rgba(27,55,104,0.08)' }}>
        <p className="text-xs mt-3" style={{ color: 'rgba(27,55,104,0.5)' }}>
          Il template pre-compila il programma e il calendario dopo la creazione del corso.
        </p>
        <select
          value={selectedTemplateId}
          onChange={e => setSelectedTemplateId(e.target.value)}
          className="w-full rounded-xl px-3 py-2 text-sm border bg-white focus:outline-none"
          style={{ borderColor: 'rgba(27,55,104,0.2)', color: selectedTemplateId ? '#1B3768' : 'rgba(27,55,104,0.4)' }}>
          <option value="">Nessun template</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.nome}{t.tipologia ? ` (${t.tipologia})` : ''}</option>)}
        </select>
      </div>
    )}
  </div>
)}
```

Modifica `handleSubmit` per aprire il modal dopo la creazione se è stato scelto un template. Dopo `router.push('/super-admin/corsi')`, invece:

```typescript
if (!isEdit && selectedTemplateId) {
  // Recupera l'id del corso appena creato
  const { data: newCourse } = await supabase.from('courses')
    .select('id').eq('name', payload.name).order('created_at', { ascending: false }).limit(1).single()
  if (newCourse) {
    setNewCorsoId(newCourse.id)
    setShowApplica(true)
    return  // Non redirige subito
  }
}
router.push('/super-admin/corsi')
router.refresh()
```

Aggiungi il modal prima del return del form:

```tsx
{showApplica && newCorsoId && (
  <ApplicaTemplateModal
    corsoId={newCorsoId}
    corsoHasEventi={false}
    onClose={() => { setShowApplica(false); router.push(`/super-admin/corsi/${newCorsoId}`) }}
    onDone={() => router.push(`/super-admin/corsi/${newCorsoId}/calendario`)}
  />
)}
```

- [ ] **Step 4: Verifica TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "ApplicaTemplate|CourseForm|corsi/\[id\]/page" | head -15
```

Expected: 0 errori.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/super-admin/corsi/[id]/ApplicaTemplateBtn.tsx" "app/(dashboard)/super-admin/corsi/[id]/page.tsx" "app/(dashboard)/docente/corsi/[id]/page.tsx" components/courses/CourseForm.tsx
git commit -m "feat: tab Calendario nei corsi + pulsante Applica Template + sezione template in nuovo corso"
```

---

### Task 13: Calendar API

**Files:**
- Create: `app/api/corsi/[id]/calendario/route.ts`

- [ ] **Step 1: Crea la directory e il file**

```bash
mkdir -p "app/api/corsi/[id]/calendario"
```

```typescript
// app/api/corsi/[id]/calendario/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: corsoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  // Verifica accesso al corso (admin, docente assegnato, studente iscritto)
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 403 })

  const isAdmin = ['super_admin', 'admin'].includes(profile.role)

  if (!isAdmin) {
    if (profile.role === 'docente') {
      const { data: assigned } = await supabase
        .from('course_instructors').select('id').eq('course_id', corsoId).eq('instructor_id', user.id).single()
      if (!assigned) return NextResponse.json({ error: 'Non assegnato a questo corso' }, { status: 403 })
    } else if (profile.role === 'studente') {
      const { data: enrolled } = await supabase
        .from('course_enrollments').select('id').eq('course_id', corsoId).eq('student_id', user.id).eq('status', 'active').single()
      if (!enrolled) return NextResponse.json({ error: 'Non iscritto a questo corso' }, { status: 403 })
    }
  }

  const { data: eventi, error } = await supabase
    .from('corso_eventi')
    .select('*, area:aree(id, nome)')
    .eq('corso_id', corsoId)
    .order('data')
    .order('ora_inizio')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: corso } = await supabase
    .from('courses').select('id, name, location, start_date, end_date').eq('id', corsoId).single()

  return NextResponse.json({ eventi: eventi ?? [], corso, role: profile.role })
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/api/corsi/[id]/calendario/route.ts"
git commit -m "feat: GET /api/corsi/[id]/calendario — fetch eventi corso con controllo accesso per ruolo"
```

---

### Task 14: CalendarioTabella component + pagine calendario

**Files:**
- Create: `components/corso/CalendarioTabella.tsx`
- Create: `app/(dashboard)/super-admin/corsi/[id]/calendario/page.tsx`
- Create: `app/(dashboard)/docente/corsi/[id]/calendario/page.tsx`
- Create: `app/(dashboard)/studente/corsi/[id]/calendario/page.tsx`

- [ ] **Step 1: Crea CalendarioTabella component**

```bash
mkdir -p components/corso
```

```typescript
// components/corso/CalendarioTabella.tsx
'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Mail, Eye } from 'lucide-react'
import type { CorsoEvento, Course } from '@/lib/types'

interface Props {
  corsoId: string
  corso: Pick<Course, 'id' | 'name'> & { location?: string | null }
  eventi: CorsoEvento[]
  canShare: boolean   // super_admin, admin, docente
  canEdit: boolean    // super_admin, admin
}

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const WEEKS_PER_PAGE = 4

/** Restituisce il lunedì della settimana contenente la data */
function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  return mon
}

/** Formatta Date → "YYYY-MM-DD" */
function toISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

function formatTime(t: string): string { return t.slice(0, 5) }

function formatWeekRange(monday: Date): string {
  const sat = new Date(monday); sat.setDate(monday.getDate() + 5)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${monday.toLocaleDateString('it-IT', opts)} – ${sat.toLocaleDateString('it-IT', opts)}`
}

export default function CalendarioTabella({ corsoId, corso, eventi, canShare, canEdit: _canEdit }: Props) {
  const [pageOffset, setPageOffset] = useState(0) // number of WEEKS_PER_PAGE blocks
  const [sendingPdf, setSendingPdf] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Determina settimana di partenza
  const firstEventDate = eventi.length > 0
    ? new Date(eventi[0].data + 'T12:00:00')
    : new Date()
  const startMonday = getMonday(firstEventDate)

  // Genera WEEKS_PER_PAGE settimane a partire dal page offset
  const weeks: Date[] = []
  for (let w = 0; w < WEEKS_PER_PAGE; w++) {
    const mon = new Date(startMonday)
    mon.setDate(startMonday.getDate() + (pageOffset * WEEKS_PER_PAGE + w) * 7)
    weeks.push(mon)
  }

  // Costruisci mappa eventi per data
  const eventiPerData = new Map<string, CorsoEvento[]>()
  eventi.forEach(ev => {
    const list = eventiPerData.get(ev.data) ?? []
    list.push(ev)
    eventiPerData.set(ev.data, list)
  })

  // Numero totale di pagine
  const lastEventDate = eventi.length > 0
    ? new Date(eventi[eventi.length - 1].data + 'T12:00:00')
    : new Date()
  const totalWeeks = Math.ceil(
    (lastEventDate.getTime() - startMonday.getTime()) / (7 * 24 * 3600 * 1000) + 1
  )
  const totalPages = Math.max(1, Math.ceil(totalWeeks / WEEKS_PER_PAGE))

  async function downloadPdf() {
    window.open(`/api/corsi/${corsoId}/calendario/pdf`, '_blank')
  }

  async function sendEmail() {
    if (!emailInput.trim()) return
    setSendingPdf(true)
    await fetch(`/api/corsi/${corsoId}/calendario/invia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput }),
    })
    setSendingPdf(false)
    setEmailSent(true)
    setShowEmailForm(false)
    setTimeout(() => setEmailSent(false), 3000)
  }

  return (
    <div className="space-y-4">
      {/* Header con azioni */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#1B3768' }}>Calendario</h2>
          <p className="text-sm" style={{ color: 'rgba(27,55,104,0.5)' }}>{corso.name}</p>
        </div>

        {canShare && (
          <div className="flex items-center gap-2">
            {emailSent && (
              <span className="text-xs text-green-600 font-medium">Email inviata ✓</span>
            )}
            {showEmailForm ? (
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="email@esempio.it"
                  className="rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-2"
                  style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768', '--tw-ring-color': '#1EB8E5' } as React.CSSProperties}
                />
                <button onClick={sendEmail} disabled={sendingPdf}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ background: sendingPdf ? 'rgba(30,184,229,0.5)' : '#1EB8E5' }}>
                  {sendingPdf ? '...' : 'Invia'}
                </button>
                <button onClick={() => setShowEmailForm(false)}
                  className="px-3 py-2 rounded-xl text-xs font-medium"
                  style={{ background: 'rgba(27,55,104,0.08)', color: '#1B3768' }}>
                  Annulla
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => setShowEmailForm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition hover:bg-gray-50"
                  style={{ borderColor: 'rgba(27,55,104,0.15)', color: '#1B3768' }}>
                  <Mail size={13} /> Invia via mail
                </button>
                <button onClick={downloadPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition"
                  style={{ background: '#1EB8E5' }}>
                  <Download size={13} /> Scarica PDF
                </button>
              </>
            )}
          </div>
        )}

        {!canShare && (
          <button onClick={downloadPdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition hover:bg-gray-50"
            style={{ borderColor: 'rgba(27,55,104,0.15)', color: '#1B3768' }}>
            <Eye size={13} /> Visualizza PDF
          </button>
        )}
      </div>

      {/* Tabella */}
      {eventi.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">Nessun evento nel calendario.</p>
          <p className="text-gray-300 text-xs mt-1">Applica un template dal tab Panoramica per generare il calendario.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs border-collapse">
            <thead>
              <tr>
                <th className="w-28 px-3 py-2.5 text-left border-b border-r"
                  style={{ borderColor: 'rgba(27,55,104,0.08)', color: 'rgba(27,55,104,0.4)', fontSize: 10, fontWeight: 600, background: 'rgba(27,55,104,0.03)' }}>
                  SETTIMANA
                </th>
                {GIORNI.map(g => (
                  <th key={g} className="px-2 py-2.5 text-center border-b"
                    style={{ borderColor: 'rgba(27,55,104,0.08)', color: '#1B3768', fontWeight: 700, background: 'rgba(27,55,104,0.03)' }}>
                    {g}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((monday, wi) => {
                // Genera le 6 date della settimana (Lun-Sab)
                const weekDates = GIORNI.map((_, i) => {
                  const d = new Date(monday)
                  d.setDate(monday.getDate() + i)
                  return d
                })

                return (
                  <tr key={wi} className={wi % 2 === 0 ? '' : ''}>
                    <td className="px-3 py-2 border-r align-top"
                      style={{ borderColor: 'rgba(27,55,104,0.06)', color: 'rgba(27,55,104,0.45)', fontSize: 10, verticalAlign: 'top', minWidth: '6rem' }}>
                      <div className="font-semibold">Sett {pageOffset * WEEKS_PER_PAGE + wi + 1}</div>
                      <div style={{ opacity: 0.7 }}>{formatWeekRange(monday)}</div>
                    </td>
                    {weekDates.map((date, di) => {
                      const dateStr = toISO(date)
                      const dayEvents = eventiPerData.get(dateStr) ?? []
                      const isToday = dateStr === toISO(new Date())

                      return (
                        <td key={di} className="px-1.5 py-1.5 align-top border-r last:border-r-0"
                          style={{
                            borderColor: 'rgba(27,55,104,0.06)',
                            minHeight: 48,
                            background: isToday ? 'rgba(30,184,229,0.04)' : dayEvents.length === 0 ? 'rgba(27,55,104,0.01)' : 'transparent',
                          }}>
                          {/* Giorno del mese */}
                          <div className="text-center mb-1" style={{ color: isToday ? '#1EB8E5' : 'rgba(27,55,104,0.35)', fontSize: 10, fontWeight: isToday ? 700 : 400 }}>
                            {date.getDate()}
                          </div>
                          {dayEvents.map(ev => (
                            <div key={ev.id} className="rounded-lg px-1.5 py-1 mb-1"
                              style={{ background: 'rgba(27,55,104,0.07)', border: '1px solid rgba(27,55,104,0.1)' }}>
                              <div className="font-semibold truncate" style={{ color: '#1B3768', fontSize: 10 }}>
                                {ev.materia}
                              </div>
                              <div style={{ color: 'rgba(27,55,104,0.5)', fontSize: 9 }}>
                                {formatTime(ev.ora_inizio)}–{formatTime(ev.ora_fine)}
                              </div>
                            </div>
                          ))}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Navigazione pagine */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPageOffset(Math.max(0, pageOffset - 1))}
            disabled={pageOffset === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition disabled:opacity-30"
            style={{ borderColor: 'rgba(27,55,104,0.15)', color: '#1B3768' }}>
            <ChevronLeft size={14} /> Prev 4 sett
          </button>
          <span className="text-xs" style={{ color: 'rgba(27,55,104,0.4)' }}>
            Pagina {pageOffset + 1} di {totalPages}
          </span>
          <button
            onClick={() => setPageOffset(Math.min(totalPages - 1, pageOffset + 1))}
            disabled={pageOffset >= totalPages - 1}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition disabled:opacity-30"
            style={{ borderColor: 'rgba(27,55,104,0.15)', color: '#1B3768' }}>
            Prossime 4 sett <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Crea le 3 pagine calendario**

```typescript
// app/(dashboard)/super-admin/corsi/[id]/calendario/page.tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, CalendarCheck, Layers, CalendarRange, CalendarDays } from 'lucide-react'
import CalendarioTabella from '@/components/corso/CalendarioTabella'
import type { CorsoEvento } from '@/lib/types'

export default async function CalendarioCorsoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) redirect('/super-admin')

  const { data: corso } = await supabase.from('courses').select('id, name, location, start_date, end_date').eq('id', id).single()
  if (!corso) notFound()

  const { data: eventi } = await supabase
    .from('corso_eventi').select('*, area:aree(id, nome)').eq('corso_id', id).order('data').order('ora_inizio')

  return (
    <div className="p-6 space-y-5">
      {/* Nav corsi */}
      <div>
        <Link href="/super-admin/corsi" className="flex items-center gap-1.5 text-sm mb-2 transition"
          style={{ color: 'rgba(27,55,104,0.5)' }}>
          <ArrowLeft size={14} /> Corsi
        </Link>
        <h1 className="text-xl font-bold" style={{ color: '#1B3768' }}>{corso.name}</h1>

        {/* Tab nav */}
        <div className="flex gap-1.5 flex-wrap mt-3">
          <Link href={`/super-admin/corsi/${id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition">
            <Layers size={14} /> Panoramica
          </Link>
          <Link href={`/super-admin/corsi/${id}/programma`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition">
            <CalendarRange size={14} /> Programma
          </Link>
          <Link href={`/super-admin/corsi/${id}/sessioni`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition">
            <CalendarDays size={14} /> Sessioni
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#1B3768' }}>
            <CalendarCheck size={14} /> Calendario
          </span>
        </div>
      </div>

      <CalendarioTabella
        corsoId={id}
        corso={corso}
        eventi={(eventi ?? []) as CorsoEvento[]}
        canShare={true}
        canEdit={true}
      />
    </div>
  )
}
```

```typescript
// app/(dashboard)/docente/corsi/[id]/calendario/page.tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, CalendarCheck, CalendarRange } from 'lucide-react'
import CalendarioTabella from '@/components/corso/CalendarioTabella'
import type { CorsoEvento } from '@/lib/types'

export default async function DocenteCalendarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'docente') redirect('/docente')

  // Verifica docente assegnato
  const { data: assigned } = await supabase
    .from('course_instructors').select('id').eq('course_id', id).eq('instructor_id', user.id).single()
  if (!assigned) notFound()

  const { data: corso } = await supabase.from('courses').select('id, name, location').eq('id', id).single()
  if (!corso) notFound()

  const { data: eventi } = await supabase
    .from('corso_eventi').select('*, area:aree(id, nome)').eq('corso_id', id).order('data').order('ora_inizio')

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/docente/corsi" className="flex items-center gap-1.5 text-sm mb-2"
          style={{ color: 'rgba(27,55,104,0.5)' }}>
          <ArrowLeft size={14} /> I miei corsi
        </Link>
        <h1 className="text-xl font-bold" style={{ color: '#1B3768' }}>{corso.name}</h1>
        <div className="flex gap-1.5 flex-wrap mt-3">
          <Link href={`/docente/corsi/${id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition">
            Panoramica
          </Link>
          <Link href={`/docente/corsi/${id}/programma`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition">
            <CalendarRange size={14} /> Programma
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#1B3768' }}>
            <CalendarCheck size={14} /> Calendario
          </span>
        </div>
      </div>

      <CalendarioTabella
        corsoId={id}
        corso={corso}
        eventi={(eventi ?? []) as CorsoEvento[]}
        canShare={true}
        canEdit={false}
      />
    </div>
  )
}
```

```typescript
// app/(dashboard)/studente/corsi/[id]/calendario/page.tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, CalendarCheck } from 'lucide-react'
import { Download } from 'lucide-react'

// Studente: solo PDF, no tabella interattiva
export default async function StudenteCalendarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: enrolled } = await supabase
    .from('course_enrollments').select('id').eq('course_id', id).eq('student_id', user.id).eq('status', 'active').single()
  if (!enrolled) notFound()

  const { data: corso } = await supabase.from('courses').select('id, name').eq('id', id).single()
  if (!corso) notFound()

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/studente/corsi" className="flex items-center gap-1.5 text-sm mb-2"
          style={{ color: 'rgba(27,55,104,0.5)' }}>
          <ArrowLeft size={14} /> I miei corsi
        </Link>
        <h1 className="text-xl font-bold" style={{ color: '#1B3768' }}>{corso.name}</h1>
        <div className="flex gap-1.5 flex-wrap mt-3">
          <Link href={`/studente/corsi/${id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition">
            Panoramica
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#1B3768' }}>
            <CalendarCheck size={14} /> Calendario
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
        <CalendarCheck size={40} className="mx-auto" style={{ color: '#1EB8E5' }} />
        <div>
          <h2 className="text-base font-semibold" style={{ color: '#1B3768' }}>Calendario del corso</h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(27,55,104,0.5)' }}>
            Scarica il PDF del calendario per visualizzare il programma delle lezioni.
          </p>
        </div>
        <a
          href={`/api/corsi/${id}/calendario/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
          style={{ background: '#1EB8E5' }}>
          <Download size={14} /> Scarica PDF calendario
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Aggiungi tab Calendario nella pagina studente**

In `app/(dashboard)/studente/corsi/[id]/page.tsx`, aggiungi dopo il link Programma:

```tsx
<Link href={`/studente/corsi/${id}/calendario`}
  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition">
  <CalendarCheck size={14} /> Calendario
</Link>
```

- [ ] **Step 4: Verifica TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "CalendarioTabella|calendario/page" | head -15
```

Expected: 0 errori.

- [ ] **Step 5: Commit**

```bash
git add components/corso/CalendarioTabella.tsx \
  "app/(dashboard)/super-admin/corsi/[id]/calendario/" \
  "app/(dashboard)/docente/corsi/[id]/calendario/" \
  "app/(dashboard)/studente/corsi/[id]/calendario/" \
  "app/(dashboard)/studente/corsi/[id]/page.tsx"
git commit -m "feat: CalendarioTabella + pagine calendario super-admin/docente/studente"
```

---

### Task 15: PDF export + Email

**Files:**
- Create: `app/api/corsi/[id]/calendario/pdf/route.tsx`
- Create: `app/api/corsi/[id]/calendario/invia/route.ts`

- [ ] **Step 1: Crea il PDF export route**

```bash
mkdir -p "app/api/corsi/[id]/calendario/pdf"
mkdir -p "app/api/corsi/[id]/calendario/invia"
```

```typescript
// app/api/corsi/[id]/calendario/pdf/route.tsx
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { CorsoEvento } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

const GIORNI_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const C = {
  navy: '#1B3768', cta: '#1EB8E5', white: '#FFFFFF',
  gray: '#6B7280', grayLight: '#E5E7EB', bg: '#F8FAFC', border: '#E2E8F0',
}

const styles = StyleSheet.create({
  page: { backgroundColor: C.white, flexDirection: 'column', fontFamily: 'Helvetica' },
  header: { backgroundColor: C.navy, paddingHorizontal: 24, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.white },
  headerSub: { fontSize: 9, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  headerBrand: { fontSize: 9, color: C.cta, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },

  tableWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  table: { borderWidth: 1, borderColor: C.grayLight, borderRadius: 4 },
  thead: { flexDirection: 'row', backgroundColor: 'rgba(27,55,104,0.06)', borderBottomWidth: 1, borderBottomColor: C.grayLight },
  thWeek: { width: 64, paddingHorizontal: 6, paddingVertical: 5 },
  thDay: { flex: 1, paddingHorizontal: 4, paddingVertical: 5, alignItems: 'center' },
  thText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.navy },

  tbody: {},
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.grayLight, minHeight: 36 },
  trAlt: { backgroundColor: C.bg },
  tdWeek: { width: 64, paddingHorizontal: 6, paddingVertical: 4, borderRightWidth: 1, borderRightColor: C.grayLight },
  tdDay: { flex: 1, paddingHorizontal: 3, paddingVertical: 3, borderRightWidth: 1, borderRightColor: C.grayLight },
  tdDayLast: { flex: 1, paddingHorizontal: 3, paddingVertical: 3 },
  weekNum: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.navy },
  weekRange: { fontSize: 7, color: C.gray, marginTop: 1 },
  dayNum: { fontSize: 7, color: C.gray, textAlign: 'center', marginBottom: 2 },
  eventChip: { backgroundColor: 'rgba(27,55,104,0.08)', borderRadius: 2, paddingHorizontal: 3, paddingVertical: 2, marginBottom: 2 },
  eventMateria: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.navy },
  eventTime: { fontSize: 6, color: C.gray },

  footer: { paddingHorizontal: 16, paddingVertical: 6, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.grayLight },
  footerText: { fontSize: 7, color: C.gray },
})

function getMonday(d: Date): Date {
  const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day
  const m = new Date(d); m.setDate(d.getDate() + diff); return m
}
function toISO(d: Date) { return d.toISOString().split('T')[0] }
function fmtTime(t: string) { return t.slice(0, 5) }
function fmtWeekRange(mon: Date) {
  const sat = new Date(mon); sat.setDate(mon.getDate() + 5)
  const o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${mon.toLocaleDateString('it-IT', o)}–${sat.toLocaleDateString('it-IT', o)}`
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: corsoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: corso } = await supabase.from('courses')
    .select('id, name, location, start_date, end_date').eq('id', corsoId).single()
  if (!corso) return NextResponse.json({ error: 'Corso non trovato' }, { status: 404 })

  const { data: eventiRaw } = await supabase.from('corso_eventi')
    .select('*').eq('corso_id', corsoId).order('data').order('ora_inizio')
  const eventi = (eventiRaw ?? []) as CorsoEvento[]

  const eventiPerData = new Map<string, CorsoEvento[]>()
  eventi.forEach(ev => {
    const list = eventiPerData.get(ev.data) ?? []; list.push(ev); eventiPerData.set(ev.data, list)
  })

  // Genera settimane (4 per pagina)
  const WEEKS_PER_PAGE = 4
  const firstDate = eventi.length > 0 ? new Date(eventi[0].data + 'T12:00:00') : new Date()
  const lastDate = eventi.length > 0 ? new Date(eventi[eventi.length - 1].data + 'T12:00:00') : new Date()
  const startMon = getMonday(firstDate)

  const totalWeeks = Math.ceil((lastDate.getTime() - startMon.getTime()) / (7 * 24 * 3600 * 1000) + 1)
  const totalPages = Math.max(1, Math.ceil(totalWeeks / WEEKS_PER_PAGE))

  const generatedOn = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
  const DAYS_HDR = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

  const PdfDoc = () => (
    <Document title={`Calendario — ${corso.name}`} author="CoachLab">
      {Array.from({ length: totalPages }, (_, pi) => {
        const weeksOnPage: Date[] = []
        for (let w = 0; w < WEEKS_PER_PAGE; w++) {
          const mon = new Date(startMon); mon.setDate(startMon.getDate() + (pi * WEEKS_PER_PAGE + w) * 7)
          weeksOnPage.push(mon)
        }
        return (
          <Page key={pi} size="A4" orientation="landscape" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>{corso.name}</Text>
                {corso.location ? <Text style={styles.headerSub}>{corso.location}</Text> : null}
              </View>
              <Text style={styles.headerBrand}>COACHLAB — Calendario</Text>
            </View>

            {/* Tabella */}
            <View style={styles.tableWrap}>
              <View style={styles.table}>
                {/* Thead */}
                <View style={styles.thead}>
                  <View style={styles.thWeek}><Text style={styles.thText}>SETTIMANA</Text></View>
                  {DAYS_HDR.map(d => (
                    <View key={d} style={styles.thDay}><Text style={styles.thText}>{d}</Text></View>
                  ))}
                </View>
                {/* Tbody */}
                <View style={styles.tbody}>
                  {weeksOnPage.map((monday, wi) => {
                    const weekDates = [0,1,2,3,4,5].map(i => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d })
                    const isAlt = wi % 2 !== 0
                    return (
                      <View key={wi} style={[styles.tr, isAlt ? styles.trAlt : {}]}>
                        <View style={styles.tdWeek}>
                          <Text style={styles.weekNum}>Sett {pi * WEEKS_PER_PAGE + wi + 1}</Text>
                          <Text style={styles.weekRange}>{fmtWeekRange(monday)}</Text>
                        </View>
                        {weekDates.map((date, di) => {
                          const dateStr = toISO(date)
                          const dayEvts = eventiPerData.get(dateStr) ?? []
                          const isLast = di === 5
                          return (
                            <View key={di} style={isLast ? styles.tdDayLast : styles.tdDay}>
                              <Text style={styles.dayNum}>{date.getDate()}</Text>
                              {dayEvts.map((ev, ei) => (
                                <View key={ei} style={styles.eventChip}>
                                  <Text style={styles.eventMateria}>{ev.materia}</Text>
                                  <Text style={styles.eventTime}>{fmtTime(ev.ora_inizio)}–{fmtTime(ev.ora_fine)}</Text>
                                </View>
                              ))}
                            </View>
                          )
                        })}
                      </View>
                    )
                  })}
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>{corso.name}{corso.location ? ` — ${corso.location}` : ''}</Text>
              <Text style={styles.footerText}>Pagina {pi + 1} di {totalPages}</Text>
              <Text style={styles.footerText}>Generato il {generatedOn} — CoachLab</Text>
            </View>
          </Page>
        )
      })}
    </Document>
  )

  const buffer = await renderToBuffer(<PdfDoc />)
  const filename = encodeURIComponent(`Calendario-${corso.name}.pdf`)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

- [ ] **Step 2: Crea l'email route**

```typescript
// app/api/corsi/[id]/calendario/invia/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id: corsoId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin', 'docente'].includes(profile.role)) {
    return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
  }

  const { email } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: 'Email obbligatoria' }, { status: 400 })

  // Genera il PDF chiamando la route interna
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const session = await supabase.auth.getSession()
  const accessToken = session.data.session?.access_token ?? ''

  const pdfRes = await fetch(`${origin}/api/corsi/${corsoId}/calendario/pdf`, {
    headers: { Cookie: `sb-access-token=${accessToken}` },
  })

  if (!pdfRes.ok) return NextResponse.json({ error: 'Errore generazione PDF' }, { status: 500 })

  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer())

  const { data: corso } = await supabase.from('courses').select('name').eq('id', corsoId).single()
  const courseName = corso?.name ?? 'Corso'

  // Invia con Resend
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log('[calendario/invia] RESEND_API_KEY non configurata')
    return NextResponse.json({ success: true, warning: 'Email non configurata' })
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const FROM = process.env.RESEND_FROM ?? 'CoachLab <noreply@coachlab.it>'
    const { error } = await resend.emails.send({
      from: FROM,
      to: [email.trim()],
      subject: `Calendario corso: ${courseName}`,
      html: `<p>In allegato il calendario del corso <strong>${courseName}</strong>.</p><p>CoachLab</p>`,
      attachments: [{
        filename: `Calendario-${courseName}.pdf`,
        content: pdfBuffer,
      }],
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Verifica TypeScript e build**

```bash
npx tsc --noEmit 2>&1 | grep -E "calendario/pdf|calendario/invia" | head -10
npm run build 2>&1 | tail -20
```

Expected: build completato senza errori TypeScript critici.

- [ ] **Step 4: Push finale**

```bash
git add \
  "app/api/corsi/[id]/calendario/pdf/route.tsx" \
  "app/api/corsi/[id]/calendario/invia/route.ts"
git commit -m "feat: PDF export calendario A4 landscape + invio via email con Resend"
git push origin main
```

---

## Self-Review

**Spec coverage check:**
- ✅ Task 10: API `/api/template/applica` — genera `corso_eventi` + `program_modules/days/blocks`
- ✅ Task 11: `ApplicaTemplateModal` — 3 step: scegli/configura/conferma
- ✅ Task 12: Tab "Calendario" in super-admin, docente, studente + pulsante "Applica template" + "Usa template" in nuovo corso
- ✅ Task 13: GET `/api/corsi/[id]/calendario` con controllo accesso per ruolo
- ✅ Task 14: `CalendarioTabella` — tabella settimanale Lun-Sab, 4 settimane/pagina, nav prev/next, download PDF, invia mail
- ✅ Task 15: PDF A4 landscape con header/tabella/footer + email con allegato Resend

**Visibilità per ruolo:**
- `super_admin/admin`: tabella completa + download + email + pulsante Applica template ✅
- `docente`: tabella completa + download PDF + email (`canShare=true`, `canEdit=false`) ✅
- `studente`: solo link download PDF, no tabella ✅

**Placeholder check:** nessun TBD.

**Type consistency:**
- `CorsoEvento.data` è `string` ("YYYY-MM-DD") — usato ovunque con `.slice(0,5)` per ora e `+T12:00:00` per parse. ✅
- `calcolaDateCorso` ritorna `Date[]`, `toSupabaseDate` converte a string. ✅
- `canShare: boolean` in `CalendarioTabella` controlla visibilità email/download. ✅
