# Template Corsi — Parte 1: Foundation (DB + Types + Template Builder) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Creare la struttura DB normalizzata, i tipi TypeScript, le API CRUD e l'UI di editing per i template corsi UEFA/FIGC con giorni, moduli e fasce orarie.

**Architecture:** Nuove tabelle `template_moduli`, `template_giorni`, `template_fasce_orarie` estendono `course_templates`. Template builder UI con toggle Giorni/Moduli, editor inline per fasce orarie. La pagina `/template/nuovo` crea solo le info base e redirige all'editor `/template/[id]` per la struttura completa.

**Tech Stack:** Next.js 15 App Router, Supabase PostgreSQL (RLS), Tailwind CSS v4, TypeScript, lucide-react

---

## File Structure

**Nuovi:**
- `supabase/migrations/20260511000000_template_struttura.sql`
- `lib/template-utils.ts` — pure function `calcolaDateCorso()`
- `components/template/FasciaRow.tsx` — fascia oraria inline editor
- `components/template/GiorniEditor.tsx` — lista giorni con fasce (struttura_tipo=giorni)
- `components/template/ModuliEditor.tsx` — lista moduli→giorni→fasce (struttura_tipo=moduli)
- `app/(dashboard)/super-admin/corsi/template/[id]/page.tsx` — server page
- `app/(dashboard)/super-admin/corsi/template/[id]/TemplateEditorClient.tsx` — 4-block editor
- `app/api/template/[id]/route.ts` — GET/PUT template completo
- `app/api/template/[id]/giorni/route.ts` — POST/DELETE giorni
- `app/api/template/[id]/moduli/route.ts` — POST/DELETE moduli
- `app/api/template/[id]/fasce/route.ts` — POST/PUT/DELETE fasce

**Modificati:**
- `lib/types.ts` — aggiunge TemplateModulo, TemplateGiorno, TemplateFascia, CourseTemplateCompleto; aggiorna CourseTemplate
- `app/(dashboard)/super-admin/corsi/template/nuovo/page.tsx` — semplificato: solo base info, redirect a [id]

---

### Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260511000000_template_struttura.sql`

- [ ] **Step 1: Crea il file di migrazione**

```sql
-- supabase/migrations/20260511000000_template_struttura.sql

-- Estende course_templates con i nuovi campi
ALTER TABLE course_templates
  ADD COLUMN IF NOT EXISTS struttura_tipo text
    CHECK (struttura_tipo IN ('giorni', 'moduli')) DEFAULT 'giorni',
  ADD COLUMN IF NOT EXISTS materiali_tags  text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS quiz_tags       text[] DEFAULT '{}';

-- Moduli (solo per struttura_tipo = 'moduli')
CREATE TABLE IF NOT EXISTS template_moduli (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES course_templates(id) ON DELETE CASCADE,
  numero      int  NOT NULL,
  titolo      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Giorni (assoluti per 'giorni', relativi al modulo per 'moduli')
CREATE TABLE IF NOT EXISTS template_giorni (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES course_templates(id) ON DELETE CASCADE,
  modulo_id   uuid REFERENCES template_moduli(id) ON DELETE CASCADE,
  numero      int  NOT NULL,
  titolo      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Fasce orarie (sempre collegate a un giorno)
CREATE TABLE IF NOT EXISTS template_fasce_orarie (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  giorno_id   uuid NOT NULL REFERENCES template_giorni(id) ON DELETE CASCADE,
  ora_inizio  time NOT NULL,
  ora_fine    time NOT NULL,
  materia     text NOT NULL,
  area_id     uuid REFERENCES aree(id) ON DELETE SET NULL,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_template_moduli_template ON template_moduli(template_id);
CREATE INDEX IF NOT EXISTS idx_template_giorni_template ON template_giorni(template_id);
CREATE INDEX IF NOT EXISTS idx_template_giorni_modulo   ON template_giorni(modulo_id);
CREATE INDEX IF NOT EXISTS idx_template_fasce_giorno    ON template_fasce_orarie(giorno_id);

-- RLS — eredita policy di course_templates
ALTER TABLE template_moduli        ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_giorni        ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_fasce_orarie  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_gestisce_template_moduli" ON template_moduli FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "docente_legge_template_moduli" ON template_moduli FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'docente')
);

CREATE POLICY "admin_gestisce_template_giorni" ON template_giorni FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "docente_legge_template_giorni" ON template_giorni FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'docente')
);

CREATE POLICY "admin_gestisce_template_fasce" ON template_fasce_orarie FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "docente_legge_template_fasce" ON template_fasce_orarie FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'docente')
);
```

- [ ] **Step 2: Applica la migrazione**

```bash
cd /Users/alessandrodanti/figc-lms
npx supabase db push --include-all
```

Expected: `Applying migration 20260511000000_template_struttura.sql... done`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260511000000_template_struttura.sql
git commit -m "feat: migration template_moduli/giorni/fasce_orarie + estende course_templates"
```

---

### Task 2: TypeScript Types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Aggiorna CourseTemplate e aggiungi nuovi tipi**

Trova la sezione `export interface CourseTemplate {` in `lib/types.ts` e sostituiscila con:

```typescript
export interface CourseTemplate {
  id: string
  nome: string
  tipologia: string | null
  struttura_tipo: 'giorni' | 'moduli'
  materiali_tags: string[]
  quiz_tags: string[]
  parametri: {
    durata_giorni?: number
    tipo_corso?: string
    materie?: Array<{ nome: string; ore: number }>
    calendario?: {
      giorni_settimana: string[]
      fasce_tipo: Array<{ inizio: string; fine: string; materia: string }>
    }
  }
  created_by: string | null
  created_at: string
}

export interface TemplateModulo {
  id: string
  template_id: string
  numero: number
  titolo: string
  created_at: string
  giorni?: TemplateGiorno[]
}

export interface TemplateGiorno {
  id: string
  template_id: string
  modulo_id: string | null
  numero: number
  titolo: string | null
  created_at: string
  fasce?: TemplateFascia[]
}

export interface TemplateFascia {
  id: string
  giorno_id: string
  ora_inizio: string   // "HH:MM:SS" da DB, usa slice(0,5) per "HH:MM"
  ora_fine: string
  materia: string
  area_id: string | null
  note: string | null
  created_at: string
  area?: Area
}

export interface CourseTemplateCompleto extends CourseTemplate {
  moduli: TemplateModulo[]   // populated solo se struttura_tipo = 'moduli'
  giorni: TemplateGiorno[]   // populated solo se struttura_tipo = 'giorni'
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
cd /Users/alessandrodanti/figc-lms
npx tsc --noEmit 2>&1 | head -30
```

Expected: nessun errore relativo ai nuovi tipi.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: tipi TemplateModulo, TemplateGiorno, TemplateFascia, CourseTemplateCompleto"
```

---

### Task 3: Template utility function

**Files:**
- Create: `lib/template-utils.ts`

- [ ] **Step 1: Crea il file**

```typescript
// lib/template-utils.ts

/**
 * Calcola le date reali del corso a partire dalla data di inizio.
 * Skippa sempre la domenica (dayOfWeek = 0).
 * Skippa il sabato (dayOfWeek = 6) se skipSabato = true.
 *
 * @param startDate  Data di inizio nel formato "YYYY-MM-DD"
 * @param nGiorni    Numero di giorni didattici da generare
 * @param options    { skipSabato?: boolean }
 * @returns          Array di Date (una per ogni giorno didattico)
 */
export function calcolaDateCorso(
  startDate: string,
  nGiorni: number,
  options: { skipSabato?: boolean } = {}
): Date[] {
  const { skipSabato = false } = options
  const dates: Date[] = []
  // Parse senza timezone: usa T12:00:00 per evitare shift da UTC
  const current = new Date(startDate + 'T12:00:00')

  while (dates.length < nGiorni) {
    const dow = current.getDay() // 0=dom, 6=sab
    const skip = dow === 0 || (skipSabato && dow === 6)
    if (!skip) {
      dates.push(new Date(current))
    }
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/** Formatta Date → "YYYY-MM-DD" per Supabase */
export function toSupabaseDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

/** Formatta Date → "Lun 12 giu" per UI preview */
export function formatGiornoPreview(d: Date): string {
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errori.

- [ ] **Step 3: Commit**

```bash
git add lib/template-utils.ts
git commit -m "feat: calcolaDateCorso utility — genera date reali saltando domenica/sabato"
```

---

### Task 4: Template detail API (GET/PUT)

**Files:**
- Create: `app/api/template/[id]/route.ts`

- [ ] **Step 1: Crea la directory e il file**

```bash
mkdir -p app/api/template/\[id\]
```

```typescript
// app/api/template/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

// GET — fetch template completo con moduli/giorni/fasce
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin', 'docente'].includes(profile.role)) {
    return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
  }

  const { data: template, error } = await supabase
    .from('course_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !template) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // Fetch moduli con giorni+fasce
  const { data: moduli } = await supabase
    .from('template_moduli')
    .select('*')
    .eq('template_id', id)
    .order('numero')

  // Fetch tutti i giorni del template
  const { data: allGiorni } = await supabase
    .from('template_giorni')
    .select('*')
    .eq('template_id', id)
    .order('numero')

  // Fetch tutte le fasce
  const giornoIds = (allGiorni ?? []).map(g => g.id)
  const { data: allFasce } = giornoIds.length > 0
    ? await supabase
        .from('template_fasce_orarie')
        .select('*, area:aree(id, nome)')
        .in('giorno_id', giornoIds)
        .order('ora_inizio')
    : { data: [] }

  // Assembla gerarchia
  const fascePerGiorno = new Map<string, typeof allFasce>()
  ;(allFasce ?? []).forEach(f => {
    const list = fascePerGiorno.get(f.giorno_id) ?? []
    list.push(f)
    fascePerGiorno.set(f.giorno_id, list)
  })

  const giorniWithFasce = (allGiorni ?? []).map(g => ({
    ...g,
    fasce: fascePerGiorno.get(g.id) ?? [],
  }))

  // Per struttura_tipo = 'moduli': giorni annidati in moduli
  const giorniPerModulo = new Map<string, typeof giorniWithFasce>()
  giorniWithFasce.forEach(g => {
    if (g.modulo_id) {
      const list = giorniPerModulo.get(g.modulo_id) ?? []
      list.push(g)
      giorniPerModulo.set(g.modulo_id, list)
    }
  })

  const moduliWithGiorni = (moduli ?? []).map(m => ({
    ...m,
    giorni: giorniPerModulo.get(m.id) ?? [],
  }))

  return NextResponse.json({
    ...template,
    moduli: moduliWithGiorni,
    giorni: giorniWithFasce.filter(g => g.modulo_id === null),
  })
}

// PUT — aggiorna campi base del template
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
  }

  const body = await req.json()
  const allowed = ['nome', 'tipologia', 'struttura_tipo', 'materiali_tags', 'quiz_tags', 'parametri']
  const update: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) update[k] = body[k]
  }

  const { data, error } = await supabase
    .from('course_templates')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, template: data })
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "template/\[id\]" | head -10
```

Expected: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add app/api/template/\[id\]/route.ts
git commit -m "feat: GET/PUT /api/template/[id] — fetch e aggiorna template completo"
```

---

### Task 5: Template sub-resource APIs (giorni, moduli, fasce)

**Files:**
- Create: `app/api/template/[id]/giorni/route.ts`
- Create: `app/api/template/[id]/moduli/route.ts`
- Create: `app/api/template/[id]/fasce/route.ts`

- [ ] **Step 1: Crea giorni route**

```bash
mkdir -p app/api/template/\[id\]/giorni
```

```typescript
// app/api/template/[id]/giorni/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!p || !['super_admin', 'admin'].includes(p.role)) return null
  return user
}

// POST — aggiunge un nuovo giorno al template
export async function POST(req: NextRequest, { params }: Params) {
  const { id: template_id } = await params
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { modulo_id, numero, titolo } = await req.json()

  const { data, error } = await supabase
    .from('template_giorni')
    .insert({ template_id, modulo_id: modulo_id ?? null, numero, titolo: titolo ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, giorno: { ...data, fasce: [] } })
}

// DELETE — rimuove un giorno (cascade su fasce)
export async function DELETE(req: NextRequest, { params: _ }: Params) {
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { id } = await req.json()
  const { error } = await supabase.from('template_giorni').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Crea moduli route**

```bash
mkdir -p app/api/template/\[id\]/moduli
```

```typescript
// app/api/template/[id]/moduli/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!p || !['super_admin', 'admin'].includes(p.role)) return null
  return user
}

// POST — aggiunge un nuovo modulo
export async function POST(req: NextRequest, { params }: Params) {
  const { id: template_id } = await params
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { numero, titolo } = await req.json()

  const { data, error } = await supabase
    .from('template_moduli')
    .insert({ template_id, numero, titolo })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, modulo: { ...data, giorni: [] } })
}

// DELETE — rimuove un modulo (cascade su giorni e fasce)
export async function DELETE(req: NextRequest, { params: _ }: Params) {
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { id } = await req.json()
  const { error } = await supabase.from('template_moduli').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Crea fasce route**

```bash
mkdir -p app/api/template/\[id\]/fasce
```

```typescript
// app/api/template/[id]/fasce/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!p || !['super_admin', 'admin'].includes(p.role)) return null
  return user
}

// POST — aggiunge una fascia
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { giorno_id, ora_inizio, ora_fine, materia, area_id, note } = await req.json()
  if (!giorno_id || !ora_inizio || !ora_fine || !materia) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }
  if (ora_fine <= ora_inizio) {
    return NextResponse.json({ error: 'ora_fine deve essere dopo ora_inizio' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('template_fasce_orarie')
    .insert({ giorno_id, ora_inizio, ora_fine, materia, area_id: area_id ?? null, note: note ?? null })
    .select('*, area:aree(id, nome)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, fascia: data })
}

// PUT — aggiorna una fascia esistente
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { id, ora_inizio, ora_fine, materia, area_id, note } = await req.json()
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })
  if (ora_fine && ora_inizio && ora_fine <= ora_inizio) {
    return NextResponse.json({ error: 'ora_fine deve essere dopo ora_inizio' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (ora_inizio !== undefined) update.ora_inizio = ora_inizio
  if (ora_fine   !== undefined) update.ora_fine   = ora_fine
  if (materia    !== undefined) update.materia    = materia
  if (area_id    !== undefined) update.area_id    = area_id
  if (note       !== undefined) update.note       = note

  const { data, error } = await supabase
    .from('template_fasce_orarie')
    .update(update)
    .eq('id', id)
    .select('*, area:aree(id, nome)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, fascia: data })
}

// DELETE — rimuove una fascia
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { id } = await req.json()
  const { error } = await supabase.from('template_fasce_orarie').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Verifica TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "template/\[id\]" | head -10
```

Expected: 0 errori.

- [ ] **Step 5: Commit**

```bash
git add app/api/template/\[id\]/giorni/route.ts app/api/template/\[id\]/moduli/route.ts app/api/template/\[id\]/fasce/route.ts
git commit -m "feat: API CRUD per template_giorni, template_moduli, template_fasce_orarie"
```

---

### Task 6: FasciaRow component

**Files:**
- Create: `components/template/FasciaRow.tsx`

- [ ] **Step 1: Crea la directory e il componente**

```bash
mkdir -p components/template
```

```typescript
// components/template/FasciaRow.tsx
'use client'

import { useState } from 'react'
import { Trash2, GripVertical } from 'lucide-react'
import type { TemplateFascia, Area } from '@/lib/types'

interface Props {
  fascia: TemplateFascia
  aree: Area[]
  onUpdate: (id: string, fields: Partial<Pick<TemplateFascia, 'ora_inizio' | 'ora_fine' | 'materia' | 'area_id' | 'note'>>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

/** Converte "HH:MM:SS" → "HH:MM" per l'input */
function toHHMM(t: string): string { return t.slice(0, 5) }

/** Aggiunge 2 ore a "HH:MM", clampa a 23:59 */
function add2h(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const total = h * 60 + (m || 0) + 120
  const nh = Math.min(Math.floor(total / 60), 23)
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

export default function FasciaRow({ fascia, aree, onUpdate, onDelete }: Props) {
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const inp = "rounded-lg px-2 py-1 text-sm border bg-white focus:outline-none focus:ring-1"
  const inpStyle = { borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768', '--tw-ring-color': '#1EB8E5' } as React.CSSProperties

  async function handleBlur(field: string, value: string) {
    if (!value.trim()) return
    setSaving(true)
    await onUpdate(fascia.id, { [field]: value })
    setSaving(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await onDelete(fascia.id)
    setDeleting(false)
  }

  return (
    <div className={`flex items-center gap-2 py-1.5 px-2 rounded-xl transition ${saving ? 'opacity-60' : ''}`}
      style={{ background: 'rgba(27,55,104,0.03)', border: '1px solid rgba(27,55,104,0.08)' }}>

      {/* Drag handle (visivo, non funzionale — drag&drop fuori scope) */}
      <GripVertical size={13} style={{ color: 'rgba(27,55,104,0.25)', flexShrink: 0 }} />

      {/* Orario inizio */}
      <input
        type="time"
        defaultValue={toHHMM(fascia.ora_inizio)}
        onBlur={e => handleBlur('ora_inizio', e.target.value)}
        className={`${inp} w-24`}
        style={inpStyle}
      />

      <span style={{ color: 'rgba(27,55,104,0.35)', fontSize: 12 }}>→</span>

      {/* Orario fine */}
      <input
        type="time"
        defaultValue={toHHMM(fascia.ora_fine)}
        onBlur={e => handleBlur('ora_fine', e.target.value)}
        className={`${inp} w-24`}
        style={inpStyle}
      />

      {/* Materia */}
      <input
        type="text"
        defaultValue={fascia.materia}
        placeholder="Materia"
        onBlur={e => handleBlur('materia', e.target.value)}
        className={`${inp} flex-1 min-w-0`}
        style={inpStyle}
      />

      {/* Area (opzionale) */}
      {aree.length > 0 && (
        <select
          defaultValue={fascia.area_id ?? ''}
          onChange={e => onUpdate(fascia.id, { area_id: e.target.value || null })}
          className={`${inp} w-32`}
          style={{ ...inpStyle, color: fascia.area_id ? '#1B3768' : 'rgba(27,55,104,0.4)' }}
        >
          <option value="">Area</option>
          {aree.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      )}

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="p-1.5 rounded-lg hover:bg-red-50 transition flex-shrink-0"
        style={{ color: deleting ? 'rgba(27,55,104,0.2)' : 'rgba(27,55,104,0.35)' }}
        title="Rimuovi fascia"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

/** Calcola l'orario default per una nuova fascia basandosi sull'ultima fascia del giorno */
export function defaultNewFascia(existingFasce: TemplateFascia[]): { ora_inizio: string; ora_fine: string } {
  if (existingFasce.length === 0) return { ora_inizio: '09:00', ora_fine: '11:00' }
  const last = existingFasce[existingFasce.length - 1]
  const inizio = toHHMM(last.ora_fine)
  return { ora_inizio: inizio, ora_fine: add2h(inizio) }
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "FasciaRow" | head -5
```

Expected: 0 errori.

- [ ] **Step 3: Commit**

```bash
git add components/template/FasciaRow.tsx
git commit -m "feat: FasciaRow — editor inline fascia oraria con orario/materia/area"
```

---

### Task 7: GiorniEditor component

**Files:**
- Create: `components/template/GiorniEditor.tsx`

- [ ] **Step 1: Crea il componente**

```typescript
// components/template/GiorniEditor.tsx
'use client'

import { useState } from 'react'
import { Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import FasciaRow, { defaultNewFascia } from './FasciaRow'
import type { TemplateGiorno, TemplateFascia, Area } from '@/lib/types'

interface Props {
  templateId: string
  giorni: TemplateGiorno[]
  aree: Area[]
  onGiorniChange: (giorni: TemplateGiorno[]) => void
}

export default function GiorniEditor({ templateId, giorni, aree, onGiorniChange }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [addingFasciaFor, setAddingFasciaFor] = useState<string | null>(null)

  function toggleCollapse(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function addGiorno() {
    setAdding(true)
    const res = await fetch(`/api/template/${templateId}/giorni`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero: giorni.length + 1, modulo_id: null }),
    })
    const json = await res.json()
    if (json.giorno) onGiorniChange([...giorni, json.giorno])
    setAdding(false)
  }

  async function deleteGiorno(id: string) {
    await fetch(`/api/template/${templateId}/giorni`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    onGiorniChange(giorni.filter(g => g.id !== id))
  }

  async function addFascia(giorno: TemplateGiorno) {
    setAddingFasciaFor(giorno.id)
    const { ora_inizio, ora_fine } = defaultNewFascia(giorno.fasce ?? [])
    const res = await fetch(`/api/template/${templateId}/fasce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ giorno_id: giorno.id, ora_inizio, ora_fine, materia: '' }),
    })
    const json = await res.json()
    if (json.fascia) {
      onGiorniChange(giorni.map(g =>
        g.id === giorno.id ? { ...g, fasce: [...(g.fasce ?? []), json.fascia] } : g
      ))
    }
    setAddingFasciaFor(null)
  }

  async function updateFascia(giornoId: string, fasciaId: string, fields: Partial<TemplateFascia>) {
    await fetch(`/api/template/${templateId}/fasce`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fasciaId, ...fields }),
    })
    onGiorniChange(giorni.map(g =>
      g.id === giornoId
        ? { ...g, fasce: (g.fasce ?? []).map(f => f.id === fasciaId ? { ...f, ...fields } : f) }
        : g
    ))
  }

  async function deleteFascia(giornoId: string, fasciaId: string) {
    await fetch(`/api/template/${templateId}/fasce`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fasciaId }),
    })
    onGiorniChange(giorni.map(g =>
      g.id === giornoId ? { ...g, fasce: (g.fasce ?? []).filter(f => f.id !== fasciaId) } : g
    ))
  }

  async function updateTitoloGiorno(id: string, titolo: string) {
    await fetch(`/api/template/${templateId}/giorni`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, titolo }),
    }).catch(() => null) // Best-effort
    onGiorniChange(giorni.map(g => g.id === id ? { ...g, titolo } : g))
  }

  return (
    <div className="space-y-2">
      {giorni.map(giorno => (
        <div key={giorno.id} className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'rgba(27,55,104,0.12)' }}>

          {/* Header giorno */}
          <div className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
            style={{ background: 'rgba(27,55,104,0.04)' }}
            onClick={() => toggleCollapse(giorno.id)}>
            <span style={{ color: 'rgba(27,55,104,0.5)', flexShrink: 0 }}>
              {collapsed.has(giorno.id) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </span>
            <span className="text-xs font-semibold" style={{ color: '#1B3768', flexShrink: 0 }}>
              Giorno {giorno.numero}
            </span>
            <input
              type="text"
              defaultValue={giorno.titolo ?? ''}
              placeholder="Titolo opzionale"
              onClick={e => e.stopPropagation()}
              onBlur={e => updateTitoloGiorno(giorno.id, e.target.value)}
              className="flex-1 bg-transparent text-sm border-0 outline-none min-w-0 placeholder:text-gray-300"
              style={{ color: '#1B3768' }}
            />
            <button
              onClick={e => { e.stopPropagation(); deleteGiorno(giorno.id) }}
              className="p-1 rounded hover:bg-red-50 transition flex-shrink-0"
              style={{ color: 'rgba(27,55,104,0.3)' }}
              title="Rimuovi giorno"
            >
              <Trash2 size={12} />
            </button>
          </div>

          {/* Fasce */}
          {!collapsed.has(giorno.id) && (
            <div className="px-3 py-2 space-y-1.5">
              {(giorno.fasce ?? []).map(f => (
                <FasciaRow
                  key={f.id}
                  fascia={f}
                  aree={aree}
                  onUpdate={(id, fields) => updateFascia(giorno.id, id, fields as Partial<TemplateFascia>)}
                  onDelete={(id) => deleteFascia(giorno.id, id)}
                />
              ))}
              <button
                onClick={() => addFascia(giorno)}
                disabled={addingFasciaFor === giorno.id}
                className="flex items-center gap-1 text-xs font-medium mt-1 transition"
                style={{ color: addingFasciaFor === giorno.id ? 'rgba(30,184,229,0.4)' : '#1EB8E5' }}
              >
                <Plus size={12} />
                {addingFasciaFor === giorno.id ? 'Aggiungendo...' : 'Aggiungi fascia'}
              </button>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={addGiorno}
        disabled={adding}
        className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition w-full border-2 border-dashed"
        style={{
          borderColor: 'rgba(27,55,104,0.15)',
          color: adding ? 'rgba(27,55,104,0.3)' : 'rgba(27,55,104,0.5)',
        }}
      >
        <Plus size={14} />
        {adding ? 'Aggiungendo giorno...' : 'Aggiungi giorno'}
      </button>
    </div>
  )
}
```

**Nota:** questa route `PUT /api/template/[id]/giorni` per aggiornare il titolo non è ancora implementata. Aggiungila come metodo opzionale o usa `best-effort` con `.catch(() => null)` come indicato sopra — il titolo si aggiorna in state locale anche senza risposta server. Per la versione completa aggiungi `PUT` al file `giorni/route.ts`:

```typescript
// Aggiungi in app/api/template/[id]/giorni/route.ts
export async function PUT(req: NextRequest, { params: _ }: Params) {
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { id, titolo } = await req.json()
  const { error } = await supabase.from('template_giorni').update({ titolo }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Aggiungi PUT a giorni/route.ts**

Apri `app/api/template/[id]/giorni/route.ts` e aggiungi dopo il metodo DELETE:

```typescript
// PUT — aggiorna titolo giorno
export async function PUT(req: NextRequest, { params: _ }: Params) {
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { id, titolo } = await req.json()
  const { error } = await supabase.from('template_giorni').update({ titolo }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Verifica TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "GiorniEditor\|giorni/route" | head -10
```

Expected: 0 errori.

- [ ] **Step 4: Commit**

```bash
git add components/template/GiorniEditor.tsx app/api/template/\[id\]/giorni/route.ts
git commit -m "feat: GiorniEditor — lista collassabile giorni+fasce con add/delete inline"
```

---

### Task 8: ModuliEditor component

**Files:**
- Create: `components/template/ModuliEditor.tsx`

- [ ] **Step 1: Crea il componente**

```typescript
// components/template/ModuliEditor.tsx
'use client'

import { useState } from 'react'
import { Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import FasciaRow, { defaultNewFascia } from './FasciaRow'
import type { TemplateModulo, TemplateGiorno, TemplateFascia, Area } from '@/lib/types'

interface Props {
  templateId: string
  moduli: TemplateModulo[]
  aree: Area[]
  onModuliChange: (moduli: TemplateModulo[]) => void
}

export default function ModuliEditor({ templateId, moduli, aree, onModuliChange }: Props) {
  const [collapsedModuli, setCollapsedModuli] = useState<Set<string>>(new Set())
  const [collapsedGiorni, setCollapsedGiorni] = useState<Set<string>>(new Set())

  function toggleModulo(id: string) {
    setCollapsedModuli(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleGiorno(id: string) {
    setCollapsedGiorni(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function addModulo() {
    const res = await fetch(`/api/template/${templateId}/moduli`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero: moduli.length + 1, titolo: `Modulo ${moduli.length + 1}` }),
    })
    const json = await res.json()
    if (json.modulo) onModuliChange([...moduli, json.modulo])
  }

  async function deleteModulo(id: string) {
    await fetch(`/api/template/${templateId}/moduli`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    onModuliChange(moduli.filter(m => m.id !== id))
  }

  async function updateModuloTitolo(id: string, titolo: string) {
    await fetch(`/api/template/${templateId}/moduli`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, titolo }),
    }).catch(() => null)
    onModuliChange(moduli.map(m => m.id === id ? { ...m, titolo } : m))
  }

  async function addGiorno(modulo: TemplateModulo) {
    const giorni = modulo.giorni ?? []
    const res = await fetch(`/api/template/${templateId}/giorni`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modulo_id: modulo.id, numero: giorni.length + 1 }),
    })
    const json = await res.json()
    if (json.giorno) {
      onModuliChange(moduli.map(m =>
        m.id === modulo.id ? { ...m, giorni: [...(m.giorni ?? []), json.giorno] } : m
      ))
    }
  }

  async function deleteGiorno(moduloId: string, giornoId: string) {
    await fetch(`/api/template/${templateId}/giorni`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: giornoId }),
    })
    onModuliChange(moduli.map(m =>
      m.id === moduloId ? { ...m, giorni: (m.giorni ?? []).filter(g => g.id !== giornoId) } : m
    ))
  }

  function updateGiorni(moduloId: string, newGiorni: TemplateGiorno[]) {
    onModuliChange(moduli.map(m => m.id === moduloId ? { ...m, giorni: newGiorni } : m))
  }

  async function addFascia(moduloId: string, giorno: TemplateGiorno) {
    const { ora_inizio, ora_fine } = defaultNewFascia(giorno.fasce ?? [])
    const res = await fetch(`/api/template/${templateId}/fasce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ giorno_id: giorno.id, ora_inizio, ora_fine, materia: '' }),
    })
    const json = await res.json()
    if (json.fascia) {
      updateGiorni(moduloId, (moduli.find(m => m.id === moduloId)?.giorni ?? []).map(g =>
        g.id === giorno.id ? { ...g, fasce: [...(g.fasce ?? []), json.fascia] } : g
      ))
    }
  }

  async function updateFascia(moduloId: string, giornoId: string, fasciaId: string, fields: Partial<TemplateFascia>) {
    await fetch(`/api/template/${templateId}/fasce`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fasciaId, ...fields }),
    })
    updateGiorni(moduloId, (moduli.find(m => m.id === moduloId)?.giorni ?? []).map(g =>
      g.id === giornoId
        ? { ...g, fasce: (g.fasce ?? []).map(f => f.id === fasciaId ? { ...f, ...fields } : f) }
        : g
    ))
  }

  async function deleteFascia(moduloId: string, giornoId: string, fasciaId: string) {
    await fetch(`/api/template/${templateId}/fasce`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fasciaId }),
    })
    updateGiorni(moduloId, (moduli.find(m => m.id === moduloId)?.giorni ?? []).map(g =>
      g.id === giornoId
        ? { ...g, fasce: (g.fasce ?? []).filter(f => f.id !== fasciaId) }
        : g
    ))
  }

  return (
    <div className="space-y-3">
      {moduli.map(modulo => (
        <div key={modulo.id} className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'rgba(27,55,104,0.15)' }}>

          {/* Header modulo */}
          <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
            style={{ background: 'rgba(27,55,104,0.07)' }}
            onClick={() => toggleModulo(modulo.id)}>
            <span style={{ color: 'rgba(27,55,104,0.6)', flexShrink: 0 }}>
              {collapsedModuli.has(modulo.id) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </span>
            <span className="text-xs font-bold uppercase tracking-wide flex-shrink-0"
              style={{ color: '#1B3768' }}>M{modulo.numero}</span>
            <input
              type="text"
              defaultValue={modulo.titolo}
              placeholder="Titolo modulo"
              onClick={e => e.stopPropagation()}
              onBlur={e => updateModuloTitolo(modulo.id, e.target.value)}
              className="flex-1 bg-transparent text-sm font-semibold border-0 outline-none min-w-0"
              style={{ color: '#1B3768' }}
            />
            <button onClick={e => { e.stopPropagation(); deleteModulo(modulo.id) }}
              className="p-1 rounded hover:bg-red-50 flex-shrink-0"
              style={{ color: 'rgba(27,55,104,0.3)' }}>
              <Trash2 size={12} />
            </button>
          </div>

          {/* Giorni del modulo */}
          {!collapsedModuli.has(modulo.id) && (
            <div className="px-3 py-2 space-y-1.5">
              {(modulo.giorni ?? []).map(giorno => (
                <div key={giorno.id} className="rounded-lg border overflow-hidden"
                  style={{ borderColor: 'rgba(27,55,104,0.08)' }}>

                  {/* Header giorno */}
                  <div className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer"
                    style={{ background: 'rgba(27,55,104,0.03)' }}
                    onClick={() => toggleGiorno(giorno.id)}>
                    <span style={{ color: 'rgba(27,55,104,0.4)', flexShrink: 0 }}>
                      {collapsedGiorni.has(giorno.id) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    </span>
                    <span className="text-xs font-medium flex-shrink-0" style={{ color: '#1B3768' }}>
                      Giorno {giorno.numero}
                    </span>
                    <input
                      type="text"
                      defaultValue={giorno.titolo ?? ''}
                      placeholder="Titolo opzionale"
                      onClick={e => e.stopPropagation()}
                      onBlur={async e => {
                        await fetch(`/api/template/${templateId}/giorni`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: giorno.id, titolo: e.target.value }),
                        }).catch(() => null)
                      }}
                      className="flex-1 bg-transparent text-xs border-0 outline-none min-w-0 placeholder:text-gray-300"
                      style={{ color: '#1B3768' }}
                    />
                    <button onClick={e => { e.stopPropagation(); deleteGiorno(modulo.id, giorno.id) }}
                      className="p-0.5 rounded hover:bg-red-50" style={{ color: 'rgba(27,55,104,0.25)' }}>
                      <Trash2 size={11} />
                    </button>
                  </div>

                  {/* Fasce */}
                  {!collapsedGiorni.has(giorno.id) && (
                    <div className="px-2.5 py-1.5 space-y-1">
                      {(giorno.fasce ?? []).map(f => (
                        <FasciaRow
                          key={f.id}
                          fascia={f}
                          aree={aree}
                          onUpdate={(id, fields) => updateFascia(modulo.id, giorno.id, id, fields as Partial<TemplateFascia>)}
                          onDelete={(id) => deleteFascia(modulo.id, giorno.id, id)}
                        />
                      ))}
                      <button
                        onClick={() => addFascia(modulo.id, giorno)}
                        className="flex items-center gap-1 text-xs font-medium"
                        style={{ color: '#1EB8E5' }}>
                        <Plus size={11} /> Fascia
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <button onClick={() => addGiorno(modulo)}
                className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg border-dashed border w-full"
                style={{ borderColor: 'rgba(27,55,104,0.12)', color: 'rgba(27,55,104,0.45)' }}>
                <Plus size={12} /> Aggiungi giorno
              </button>
            </div>
          )}
        </div>
      ))}

      <button onClick={addModulo}
        className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border-2 border-dashed w-full"
        style={{ borderColor: 'rgba(27,55,104,0.15)', color: 'rgba(27,55,104,0.5)' }}>
        <Plus size={14} /> Aggiungi modulo
      </button>
    </div>
  )
}
```

Aggiungi anche `PUT` a `moduli/route.ts`:

```typescript
// Aggiungi in app/api/template/[id]/moduli/route.ts
export async function PUT(req: NextRequest, { params: _ }: Params) {
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { id, titolo } = await req.json()
  const { error } = await supabase.from('template_moduli').update({ titolo }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Aggiungi PUT a moduli/route.ts**

Apri `app/api/template/[id]/moduli/route.ts` e aggiungi il metodo PUT mostrato sopra dopo DELETE.

- [ ] **Step 3: Verifica TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "ModuliEditor\|moduli/route" | head -10
```

Expected: 0 errori.

- [ ] **Step 4: Commit**

```bash
git add components/template/ModuliEditor.tsx app/api/template/\[id\]/moduli/route.ts
git commit -m "feat: ModuliEditor — editor moduli→giorni→fasce con add/delete inline"
```

---

### Task 9: TemplateEditorClient + page [id] + update Nuovo Template page

**Files:**
- Create: `app/(dashboard)/super-admin/corsi/template/[id]/page.tsx`
- Create: `app/(dashboard)/super-admin/corsi/template/[id]/TemplateEditorClient.tsx`
- Modify: `app/(dashboard)/super-admin/corsi/template/nuovo/page.tsx`

- [ ] **Step 1: Crea il server page**

```bash
mkdir -p "app/(dashboard)/super-admin/corsi/template/[id]"
```

```typescript
// app/(dashboard)/super-admin/corsi/template/[id]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TemplateEditorClient from './TemplateEditorClient'
import { TIPOLOGIE_CORSO } from '@/lib/tipologie-corso'

export default async function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) redirect('/super-admin')

  // Fetch template
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/template/${id}`, {
    headers: { Cookie: `sb-access-token=${(await supabase.auth.getSession()).data.session?.access_token ?? ''}` },
    cache: 'no-store',
  })

  // Alternativa: fetch diretto via supabase server (più robusto per SSR)
  const { data: template, error: tErr } = await supabase
    .from('course_templates').select('*').eq('id', id).single()
  if (tErr || !template) notFound()

  const { data: moduli } = await supabase
    .from('template_moduli').select('*').eq('template_id', id).order('numero')

  const { data: allGiorni } = await supabase
    .from('template_giorni').select('*').eq('template_id', id).order('numero')

  const giornoIds = (allGiorni ?? []).map(g => g.id)
  const { data: allFasce } = giornoIds.length > 0
    ? await supabase.from('template_fasce_orarie').select('*, area:aree(id, nome)')
        .in('giorno_id', giornoIds).order('ora_inizio')
    : { data: [] }

  const { data: aree } = await supabase.from('aree').select('id, nome').order('nome')

  // Assembla gerarchia
  const fascePerGiorno = new Map<string, unknown[]>()
  ;(allFasce ?? []).forEach((f: Record<string, unknown>) => {
    const list = fascePerGiorno.get(f.giorno_id as string) ?? []
    list.push(f)
    fascePerGiorno.set(f.giorno_id as string, list)
  })

  const giorniWithFasce = (allGiorni ?? []).map(g => ({ ...g, fasce: fascePerGiorno.get(g.id) ?? [] }))

  const giorniPerModulo = new Map<string, typeof giorniWithFasce>()
  giorniWithFasce.forEach(g => {
    if (g.modulo_id) {
      const list = giorniPerModulo.get(g.modulo_id) ?? []
      list.push(g)
      giorniPerModulo.set(g.modulo_id, list)
    }
  })

  const moduliWithGiorni = (moduli ?? []).map(m => ({ ...m, giorni: giorniPerModulo.get(m.id) ?? [] }))
  const giorniTop = giorniWithFasce.filter(g => !g.modulo_id)

  const templateCompleto = {
    ...template,
    struttura_tipo: template.struttura_tipo ?? 'giorni',
    materiali_tags: template.materiali_tags ?? [],
    quiz_tags: template.quiz_tags ?? [],
    moduli: moduliWithGiorni,
    giorni: giorniTop,
  }

  return (
    <TemplateEditorClient
      template={templateCompleto as never}
      aree={aree ?? []}
      tipologie={[...TIPOLOGIE_CORSO]}
    />
  )
}
```

- [ ] **Step 2: Crea TemplateEditorClient**

```typescript
// app/(dashboard)/super-admin/corsi/template/[id]/TemplateEditorClient.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react'
import GiorniEditor from '@/components/template/GiorniEditor'
import ModuliEditor from '@/components/template/ModuliEditor'
import type { CourseTemplateCompleto, TemplateGiorno, TemplateModulo, Area } from '@/lib/types'
import { TIPOLOGIE_CORSO } from '@/lib/tipologie-corso'

interface Props {
  template: CourseTemplateCompleto
  aree: Area[]
  tipologie: string[]
}

const TIPOLOGIE_LIST = [...TIPOLOGIE_CORSO]

export default function TemplateEditorClient({ template, aree }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Campi base
  const [nome, setNome] = useState(template.nome)
  const [tipologia, setTipologia] = useState(template.tipologia ?? '')
  const [tipoCorsoProp, setTipoCorso] = useState<string>(
    (template.parametri as { tipo_corso?: string })?.tipo_corso ?? 'centrale'
  )
  const [strutturaTipo, setStrutturaTipo] = useState<'giorni' | 'moduli'>(template.struttura_tipo)
  const [materialiTags, setMaterialiTags] = useState<string[]>(template.materiali_tags ?? [])
  const [quizTags, setQuizTags] = useState<string[]>(template.quiz_tags ?? [])
  const [warnSwitch, setWarnSwitch] = useState(false)

  // Struttura
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

  function handleSwitchStruttura(to: 'giorni' | 'moduli') {
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
            {TIPOLOGIE_LIST.map(t => <option key={t} value={t}>{t}</option>)}
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
          {/* Toggle Giorni/Moduli */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(27,55,104,0.06)' }}>
            {(['giorni', 'moduli'] as const).map(s => (
              <button key={s} type="button"
                onClick={() => {
                  if (s !== strutturaTipo) handleSwitchStruttura(s)
                }}
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

        {/* Warning cambio struttura */}
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
                <button onClick={() => {
                  const to = strutturaTipo === 'giorni' ? 'moduli' : 'giorni'
                  setStrutturaTipo(to)
                  setWarnSwitch(false)
                  fetch(`/api/template/${template.id}`, {
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
            I file dell'archivio con queste tipologie verranno proposti automaticamente
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TIPOLOGIE_LIST.map(t => (
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
          {TIPOLOGIE_LIST.map(t => (
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
```

**Nota:** `handleSwitchStruttura` è dichiarata come funzione sincrona ma chiama `await`. Correggila aggiungendo `async`:

```typescript
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
```

- [ ] **Step 3: Aggiorna Nuovo Template page**

Sostituisci completamente `app/(dashboard)/super-admin/corsi/template/nuovo/page.tsx` con:

```typescript
// app/(dashboard)/super-admin/corsi/template/nuovo/page.tsx
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
    struttura_tipo: 'giorni' as 'giorni' | 'moduli',
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

    // Redirect all'editor completo per aggiungere giorni/moduli/fasce
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
          Crea il template, poi aggiungerai giorni e fasce orarie nell'editor.
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
            {(['giorni', 'moduli'] as const).map(s => (
              <button key={s} type="button"
                onClick={() => setForm(p => ({ ...p, struttura_tipo: s }))}
                className="flex-1 py-2 rounded-xl text-sm font-medium capitalize transition"
                style={{
                  background: form.struttura_tipo === s ? '#1B3768' : 'rgba(27,55,104,0.08)',
                  color: form.struttura_tipo === s ? 'white' : '#1B3768',
                }}>
                {s === 'giorni' ? 'Giorni sequenziali' : 'Moduli + Giorni'}
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
```

- [ ] **Step 4: Aggiorna course-templates API per salvare nuovi campi**

Il POST in `/api/course-templates/route.ts` deve passare i nuovi campi. Apri il file e controlla che `{ ...body, created_by: user.id }` passi tutti i campi inclusi `struttura_tipo`, `materiali_tags`, `quiz_tags`. Se l'API fa uno spread di `body`, funziona automaticamente senza modifca. Verifica che non stia whitelisting i campi:

```typescript
// Se il file ha whitelist, aggiorna così:
const { nome, tipologia, struttura_tipo, materiali_tags, quiz_tags, parametri } = body
const { data, error } = await supabase
  .from('course_templates')
  .insert({ nome, tipologia, struttura_tipo: struttura_tipo ?? 'giorni', materiali_tags: materiali_tags ?? [], quiz_tags: quiz_tags ?? [], parametri: parametri ?? {}, created_by: user.id })
  .select().single()
```

- [ ] **Step 5: Verifica TypeScript e build**

```bash
npx tsc --noEmit 2>&1 | grep -E "TemplateEditor|template/\[id\]" | head -15
```

Expected: 0 errori.

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/super-admin/corsi/template/[id]/" "app/(dashboard)/super-admin/corsi/template/nuovo/page.tsx" app/api/course-templates/route.ts
git commit -m "feat: template editor full (4 blocchi) + update nuovo-template page"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Task 1: DB schema — `template_moduli`, `template_giorni`, `template_fasce_orarie`, ALTER `course_templates`
- ✅ Task 2: TypeScript types — tutti i tipi richiesti dalla spec
- ✅ Task 3: `calcolaDateCorso()` utility — usata in Parte 2
- ✅ Task 4-5: API CRUD template — GET/PUT + giorni/moduli/fasce
- ✅ Task 6-8: Editor UI — FasciaRow, GiorniEditor, ModuliEditor
- ✅ Task 9: Template editor page + update nuovo page
- ⏭ Apply template, CalendarioTabella, PDF, Email → Parte 2

**Placeholder check:** nessun TBD o TODO.

**Type consistency:**
- `TemplateFascia.ora_inizio` è `string` in tutti i punti. `toHHMM()` fa `.slice(0,5)` per convertire "HH:MM:SS" → "HH:MM" per gli input. ✅
- `CourseTemplateCompleto` estende `CourseTemplate` con `moduli: TemplateModulo[]` e `giorni: TemplateGiorno[]`. ✅
- `GiorniEditor.onGiorniChange` prende `TemplateGiorno[]`, `ModuliEditor.onModuliChange` prende `TemplateModulo[]`. ✅

---

**Continua con:** `docs/superpowers/plans/2026-05-10-template-corsi-parte-2.md`
