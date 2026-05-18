# Calendar Template Builder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual "Aggiungi Giorno" workflow in the template editor with a visual calendar-based builder that lets admins define course structure (which days/weeks are active) in seconds by clicking date ranges, then configure time slots grouped by weekday.

**Architecture:** Add a new `struttura_tipo = 'calendario'` mode to templates. The calendar builder stores each selected day as a `template_giorno` with `giorno_settimana` (1=Mon..6=Sat) and `settimana_numero` (relative week index, gaps = pause weeks). The apply-template route detects this structure and maps days to actual dates via `start_date + (settimana_numero - 1) * 7 + (giorno_settimana - 1)`. Existing `'giorni'` and `'moduli'` modes remain untouched for backward compatibility.

**Tech Stack:** Next.js 15 App Router, Supabase PostgreSQL, React state management (no external calendar library), Tailwind CSS v4, TypeScript.

---

## File Map

| Action | Path |
|--------|------|
| Create | `supabase/migrations/023_template_calendario.sql` |
| Modify | `lib/types.ts` (TemplateGiorno, TemplateFascia, CourseTemplate) |
| Modify | `app/api/template/[id]/giorni/route.ts` (POST/PUT/DELETE bulk) |
| Modify | `app/api/template/[id]/fasce/route.ts` (POST/PUT accept tipo_pausa) |
| Modify | `app/api/template/[id]/route.ts` (PUT accept ore_totali) |
| Create | `components/template/OrarioCounter.tsx` |
| Create | `components/template/CalendarioBuilder.tsx` |
| Create | `components/template/SettimaneFasceEditor.tsx` |
| Modify | `app/(dashboard)/super-admin/corsi/template/[id]/TemplateEditorClient.tsx` |
| Modify | `app/api/template/applica/route.ts` |

---

## Task 1: DB Migration 023

**Files:**
- Create: `supabase/migrations/023_template_calendario.sql`

### Context

Run this via Supabase SQL Editor (Dashboard → SQL Editor → New Query → paste → Run).

- [ ] **Step 1: Write the migration SQL**

```sql
-- Add calendar-structure fields to template_giorni
ALTER TABLE template_giorni
  ADD COLUMN IF NOT EXISTS giorno_settimana smallint,        -- 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  ADD COLUMN IF NOT EXISTS settimana_numero  smallint,        -- 1-based week index (gaps = pause weeks)
  ADD COLUMN IF NOT EXISTS is_mezza_giornata boolean DEFAULT false;

-- Add break-type to fasce
ALTER TABLE template_fasce_orarie
  ADD COLUMN IF NOT EXISTS tipo_pausa text;                   -- null=lesson, 'caffe'|'pranzo'|'cena'

-- Add total hours target to templates
ALTER TABLE course_templates
  ADD COLUMN IF NOT EXISTS ore_totali numeric(5,1);           -- e.g. 120.0

-- New struttura_tipo value 'calendario' is allowed by existing text column (no enum)
```

Create the file locally for tracking:
```bash
cat > "/Users/alessandrodanti/Documents/Claude Workspace/CoachLab LMS/web-app/supabase/migrations/023_template_calendario.sql" << 'EOF'
ALTER TABLE template_giorni
  ADD COLUMN IF NOT EXISTS giorno_settimana smallint,
  ADD COLUMN IF NOT EXISTS settimana_numero  smallint,
  ADD COLUMN IF NOT EXISTS is_mezza_giornata boolean DEFAULT false;

ALTER TABLE template_fasce_orarie
  ADD COLUMN IF NOT EXISTS tipo_pausa text;

ALTER TABLE course_templates
  ADD COLUMN IF NOT EXISTS ore_totali numeric(5,1);
EOF
```

- [ ] **Step 2: Execute in Supabase SQL Editor**

Paste the SQL from Step 1 into the Supabase Dashboard SQL Editor and run it. Verify it returns "Success. No rows returned."

- [ ] **Step 3: Verify columns exist**

Run in SQL Editor:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('template_giorni','template_fasce_orarie','course_templates')
  AND column_name IN ('giorno_settimana','settimana_numero','is_mezza_giornata','tipo_pausa','ore_totali')
ORDER BY table_name, column_name;
```
Expected: 5 rows returned.

- [ ] **Step 4: Commit the migration file**

```bash
cd "/Users/alessandrodanti/Documents/Claude Workspace/CoachLab LMS/web-app"
git add supabase/migrations/023_template_calendario.sql
git commit -m "feat: migration 023 — calendar template builder columns"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `lib/types.ts` lines ~240–294

- [ ] **Step 1: Update CourseTemplate interface**

In `lib/types.ts`, find `export interface CourseTemplate` (around line 240) and add `ore_totali`:

```typescript
export interface CourseTemplate {
  id: string
  nome: string
  tipologia: string | null
  struttura_tipo: 'giorni' | 'moduli' | 'calendario'   // ← add 'calendario'
  ore_totali: number | null                              // ← add this
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
```

- [ ] **Step 2: Update TemplateGiorno interface**

Find `export interface TemplateGiorno` and add new fields:

```typescript
export interface TemplateGiorno {
  id: string
  template_id: string
  modulo_id: string | null
  numero: number
  titolo: string | null
  giorno_settimana: number | null   // 1=Mon..6=Sat, populated by calendario builder
  settimana_numero: number | null   // 1-based week index
  is_mezza_giornata: boolean        // half-day flag
  created_at: string
  fasce?: TemplateFascia[]
}
```

- [ ] **Step 3: Update TemplateFascia interface**

Find `export interface TemplateFascia` and add `tipo_pausa`:

```typescript
export interface TemplateFascia {
  id: string
  giorno_id: string
  ora_inizio: string
  ora_fine: string
  materia: string
  area_id: string | null
  note: string | null
  tipo_pausa: string | null   // null=lesson, 'caffe'|'pranzo'|'cena'
  created_at: string
  area?: Area
}
```

- [ ] **Step 4: Update CourseTemplateCompleto**

Find `export interface CourseTemplateCompleto extends CourseTemplate` — update the struttura_tipo union there too, if it overrides it. If not (it just extends), it inherits automatically. Check and adjust if needed.

- [ ] **Step 5: TypeScript check**

```bash
cd "/Users/alessandrodanti/Documents/Claude Workspace/CoachLab LMS/web-app"
npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```

Fix any type errors before committing.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add calendar template types (giorno_settimana, settimana_numero, ore_totali)"
```

---

## Task 3: Update Giorni API

**Files:**
- Modify: `app/api/template/[id]/giorni/route.ts`

The current POST only accepts `modulo_id, numero, titolo`. We need to:
1. Accept `giorno_settimana`, `settimana_numero`, `is_mezza_giornata` in POST and PUT.
2. Add a new **bulk-replace endpoint (PUT with array)** so CalendarioBuilder can atomically replace all giorni in one call.

- [ ] **Step 1: Update POST to accept new fields**

In `route.ts`, find the POST handler and update it:

```typescript
export async function POST(req: NextRequest, { params }: Params) {
  const { id: template_id } = await params
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const { modulo_id, numero, titolo, giorno_settimana, settimana_numero, is_mezza_giornata } = await req.json()

  const { data, error } = await supabase
    .from('template_giorni')
    .insert({
      template_id,
      modulo_id: modulo_id ?? null,
      numero,
      titolo: titolo ?? null,
      giorno_settimana: giorno_settimana ?? null,
      settimana_numero: settimana_numero ?? null,
      is_mezza_giornata: is_mezza_giornata ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, giorno: { ...data, fasce: [] } })
}
```

- [ ] **Step 2: Read the full current PUT handler**

Read `app/api/template/[id]/giorni/route.ts` to find the PUT handler (if it exists). If it doesn't exist, add it after DELETE.

- [ ] **Step 3: Update or add PUT handler with bulk-replace support**

The PUT handler should handle two cases:
- `{ id, titolo }` — single update (existing behaviour for title edits)
- `{ bulk: true, giorni: Array<{numero, giorno_settimana, settimana_numero, is_mezza_giornata, titolo?}> }` — bulk replace all giorni for this template (used by CalendarioBuilder)

```typescript
export async function PUT(req: NextRequest, { params }: Params) {
  const { id: template_id } = await params
  const supabase = await createClient()
  if (!await requireAdmin(supabase)) return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })

  const body = await req.json()

  // Bulk replace: CalendarioBuilder sends all giorni at once
  if (body.bulk === true) {
    const giorni = body.giorni as Array<{
      numero: number
      titolo?: string
      giorno_settimana?: number
      settimana_numero?: number
      is_mezza_giornata?: boolean
    }>

    // Delete all existing giorni for this template (cascades fasce)
    await supabase.from('template_giorni').delete().eq('template_id', template_id)

    if (giorni.length === 0) return NextResponse.json({ success: true, giorni: [] })

    const { data, error } = await supabase
      .from('template_giorni')
      .insert(giorni.map(g => ({
        template_id,
        numero: g.numero,
        titolo: g.titolo ?? null,
        giorno_settimana: g.giorno_settimana ?? null,
        settimana_numero: g.settimana_numero ?? null,
        is_mezza_giornata: g.is_mezza_giornata ?? false,
        modulo_id: null,
      })))
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, giorni: (data ?? []).map(g => ({ ...g, fasce: [] })) })
  }

  // Single update (title edit from GiorniEditor)
  const { id, titolo } = body
  if (!id) return NextResponse.json({ error: 'id mancante' }, { status: 400 })

  const { data, error } = await supabase
    .from('template_giorni')
    .update({ titolo })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, giorno: data })
}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add "app/api/template/[id]/giorni/route.ts"
git commit -m "feat: giorni API — accept new calendar fields + bulk-replace endpoint"
```

---

## Task 4: Update Fasce API (tipo_pausa)

**Files:**
- Modify: `app/api/template/[id]/fasce/route.ts`

- [ ] **Step 1: Update POST to accept tipo_pausa**

Find the POST handler in `fasce/route.ts`. Change the destructuring from:
```typescript
const { giorno_id, ora_inizio, ora_fine, materia, area_id, note } = await req.json()
```
to:
```typescript
const { giorno_id, ora_inizio, ora_fine, materia, area_id, note, tipo_pausa } = await req.json()
```

And update the insert:
```typescript
.insert({ giorno_id, ora_inizio, ora_fine, materia, area_id: area_id ?? null, note: note ?? null, tipo_pausa: tipo_pausa ?? null })
```

- [ ] **Step 2: Update PUT to accept tipo_pausa**

Find the PUT handler. Add `tipo_pausa` to the destructuring and the update object:
```typescript
const { id, ora_inizio, ora_fine, materia, area_id, note, tipo_pausa } = await req.json()
// ...
if (tipo_pausa  !== undefined) update.tipo_pausa  = tipo_pausa
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add "app/api/template/[id]/fasce/route.ts"
git commit -m "feat: fasce API — accept tipo_pausa (caffe/pranzo/cena)"
```

---

## Task 5: Update Template PUT API (ore_totali)

**Files:**
- Modify: `app/api/template/[id]/route.ts`

- [ ] **Step 1: Read the current route.ts**

Read `app/api/template/[id]/route.ts` to find the PUT handler.

- [ ] **Step 2: Add ore_totali to the PUT handler**

In the PUT handler, find where the update object is built (likely from `nome`, `tipologia`, `struttura_tipo`, etc.) and add `ore_totali`:

```typescript
const { nome, tipologia, struttura_tipo, materiali_tags, quiz_tags, parametri, ore_totali } = await req.json()

const update: Record<string, unknown> = {}
if (nome          !== undefined) update.nome           = nome
if (tipologia     !== undefined) update.tipologia      = tipologia
if (struttura_tipo !== undefined) update.struttura_tipo = struttura_tipo
if (materiali_tags !== undefined) update.materiali_tags = materiali_tags
if (quiz_tags     !== undefined) update.quiz_tags      = quiz_tags
if (parametri     !== undefined) update.parametri      = parametri
if (ore_totali    !== undefined) update.ore_totali     = ore_totali
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add "app/api/template/[id]/route.ts"
git commit -m "feat: template API — accept ore_totali in PUT"
```

---

## Task 6: Build OrarioCounter Component

**Files:**
- Create: `components/template/OrarioCounter.tsx`

This widget shows: "X ore / Y ore totali" with a color-coded progress bar. It computes used hours from all fasce (excluding pause types from lesson-hour count… actually pause fasce still take time, so count all). Negative remaining → red.

- [ ] **Step 1: Create OrarioCounter.tsx**

```tsx
'use client'

import type { TemplateGiorno } from '@/lib/types'

interface Props {
  oreTotali: number | null
  giorni: TemplateGiorno[]
  className?: string
}

function minutiToOre(minuti: number): string {
  const h = Math.floor(minuti / 60)
  const m = minuti % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function parseMinuti(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export function calcolaOreUsate(giorni: TemplateGiorno[]): number {
  let totaleMinuti = 0
  for (const g of giorni) {
    for (const f of (g.fasce ?? [])) {
      const inizio = parseMinuti(f.ora_inizio)
      const fine   = parseMinuti(f.ora_fine)
      if (fine > inizio) totaleMinuti += fine - inizio
    }
  }
  return totaleMinuti / 60
}

export default function OrarioCounter({ oreTotali, giorni, className }: Props) {
  const oreUsate = calcolaOreUsate(giorni)
  const oreRimanenti = oreTotali != null ? oreTotali - oreUsate : null
  const percentuale   = oreTotali != null && oreTotali > 0 ? Math.min(100, (oreUsate / oreTotali) * 100) : 0

  const barColor = oreRimanenti == null
    ? '#1EB8E5'
    : oreRimanenti < 0
      ? '#ef4444'
      : oreRimanenti < oreTotali! * 0.1
        ? '#f59e0b'
        : '#1EB8E5'

  return (
    <div className={`rounded-xl p-3 space-y-1.5 ${className ?? ''}`}
      style={{ background: 'rgba(27,55,104,0.04)', border: '1px solid rgba(27,55,104,0.08)' }}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium" style={{ color: '#1B3768' }}>
          Ore di lezione
        </span>
        <span className="text-xs font-semibold" style={{ color: barColor }}>
          {oreUsate % 1 === 0 ? `${oreUsate}h` : `${oreUsate.toFixed(1)}h`}
          {oreTotali != null && (
            <span style={{ color: 'rgba(27,55,104,0.4)', fontWeight: 400 }}>
              {' '}/ {oreTotali}h target
            </span>
          )}
        </span>
      </div>

      {oreTotali != null && (
        <>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(27,55,104,0.1)' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${percentuale}%`, backgroundColor: barColor }} />
          </div>
          <p className="text-xs" style={{ color: oreRimanenti! < 0 ? '#ef4444' : 'rgba(27,55,104,0.45)' }}>
            {oreRimanenti! < 0
              ? `${Math.abs(oreRimanenti!).toFixed(1)}h in eccesso`
              : `${oreRimanenti!.toFixed(1)}h rimanenti`}
          </p>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add components/template/OrarioCounter.tsx
git commit -m "feat: OrarioCounter — hours progress widget for templates"
```

---

## Task 7: Build CalendarioBuilder Component

**Files:**
- Create: `components/template/CalendarioBuilder.tsx`

This is the core calendar UI. It shows a monthly grid (Mon–Sat columns only, Sun hidden), lets the user click to start a range and click again to end it (hotel-style), adds the range as highlighted days, and syncs to `template_giorni` via the bulk-replace API.

**UX summary:**
1. Shows current month + 2 next months (3 months visible at once, paginated by 3).
2. Click a day → it becomes `rangeStart` (highlighted in amber).
3. Click another day → all Mon–Sat days between start and end are selected (teal).
4. Selected days accumulate; clicking a new unselected day after a complete range starts a NEW range.
5. Clicking a selected day deselects the entire range it belongs to (or toggles it individually; simpler: toggle individual days).
6. A summary sidebar shows "Settimana N — Lun, Mer, Ven" for each week with selections.
7. "Applica struttura" button calls PUT `/api/template/[id]/giorni` with `{ bulk: true, giorni: [...] }`.
8. Half-day toggle: each day in the summary has a "½" button to toggle `is_mezza_giornata`.

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Check, Clock } from 'lucide-react'
import type { TemplateGiorno } from '@/lib/types'

interface Props {
  templateId: string
  giorni: TemplateGiorno[]
  onGiorniChange: (giorni: TemplateGiorno[]) => void
}

const GIORNI_SETTIMANA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

// Returns ISO date string "YYYY-MM-DD" for a Date
function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Returns day of week: 1=Mon .. 6=Sat, 0=Sun
function dowMonday(d: Date): number {
  return ((d.getDay() + 6) % 7) + 1  // 1=Mon..7=Sun
}

// Returns all calendar days (Mon-Sat) for a given year+month
// Pads to full weeks
function buildMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  // start from the Monday of the first week
  const startDow = (firstDay.getDay() + 6) % 7  // 0=Mon
  const rows: (Date | null)[][] = []
  let current = new Date(year, month, 1 - startDow)
  while (current <= lastDay || current.getMonth() === month) {
    const week: (Date | null)[] = []
    for (let d = 0; d < 6; d++) {  // Mon–Sat only
      const cell = new Date(current)
      week.push(cell.getMonth() === month ? cell : null)
      current.setDate(current.getDate() + 1)
    }
    current.setDate(current.getDate() + 1)  // skip Sunday
    rows.push(week)
    if (rows.length > 6) break
  }
  return rows
}

// Given a set of ISO dates, group by "week of year" (ISO), then assign settimana_numero
// accounting for gaps (pause weeks).
function buildGiorni(selectedDates: Set<string>, halfDays: Set<string>): Array<{
  numero: number
  giorno_settimana: number
  settimana_numero: number
  is_mezza_giornata: boolean
  isoDate: string
}> {
  if (selectedDates.size === 0) return []

  const sorted = [...selectedDates].sort()
  // Group by ISO week (year-week string)
  const weekMap = new Map<string, string[]>()
  for (const iso of sorted) {
    const d = new Date(iso + 'T12:00:00')
    const year = d.getFullYear()
    // ISO week number
    const jan4 = new Date(year, 0, 4)
    const weekStart = new Date(jan4)
    weekStart.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
    const weekNum = Math.ceil(((d.getTime() - weekStart.getTime()) / 86400000 + 1) / 7)
    const key = `${year}-${String(weekNum).padStart(2, '0')}`
    const list = weekMap.get(key) ?? []
    list.push(iso)
    weekMap.set(key, list)
  }

  // Sort week keys, assign settimana_numero (consecutive from 1, counting gaps too)
  const weekKeys = [...weekMap.keys()].sort()
  // Build a dense week sequence from first to last week
  const firstKey = weekKeys[0]
  const lastKey  = weekKeys[weekKeys.length - 1]
  const allWeeks: string[] = []
  {
    const [fy, fw] = firstKey.split('-').map(Number)
    let y = fy, w = fw
    while (true) {
      const key = `${y}-${String(w).padStart(2, '0')}`
      allWeeks.push(key)
      if (key === lastKey) break
      w++
      // approximate: 52 weeks per year
      if (w > 52) { w = 1; y++ }
      if (allWeeks.length > 200) break  // safety
    }
  }

  const result: ReturnType<typeof buildGiorni> = []
  let numero = 1
  for (let wi = 0; wi < allWeeks.length; wi++) {
    const settimana_numero = wi + 1
    const dates = weekMap.get(allWeeks[wi])
    if (!dates) continue
    for (const iso of dates) {
      const d = new Date(iso + 'T12:00:00')
      result.push({
        numero: numero++,
        giorno_settimana: dowMonday(d),
        settimana_numero,
        is_mezza_giornata: halfDays.has(iso),
        isoDate: iso,
      })
    }
  }
  return result
}

export default function CalendarioBuilder({ templateId, giorni, onGiorniChange }: Props) {
  const today = new Date()
  const [pageOffset, setPageOffset] = useState(0)  // 0 = shows today's month + 2 next
  const [selectedDates, setSelectedDates] = useState<Set<string>>(() => {
    const s = new Set<string>()
    // Reconstruct selected dates from existing giorni if they have calendar fields
    // We can't reconstruct exact dates from structure alone, so start fresh if no isoDate stored
    return s
  })
  const [halfDays, setHalfDays] = useState<Set<string>>(new Set())
  const [rangeStart, setRangeStart] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Build 3 months for display
  const months = useMemo(() => {
    const base = new Date(today.getFullYear(), today.getMonth() + pageOffset, 1)
    return [0, 1, 2].map(offset => {
      const d = new Date(base.getFullYear(), base.getMonth() + offset, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }, [pageOffset])

  function handleDayClick(iso: string) {
    const d = new Date(iso + 'T12:00:00')
    const dow = dowMonday(d)
    if (dow === 7) return  // Sunday: disabled (shouldn't appear but safety)

    if (rangeStart === null) {
      // Start a new range
      setRangeStart(iso)
    } else if (rangeStart === iso) {
      // Cancel range start
      setRangeStart(null)
    } else {
      // Complete the range: select all Mon-Sat between rangeStart and iso
      const start = new Date(Math.min(new Date(rangeStart + 'T12:00:00').getTime(), new Date(iso + 'T12:00:00').getTime()))
      const end   = new Date(Math.max(new Date(rangeStart + 'T12:00:00').getTime(), new Date(iso + 'T12:00:00').getTime()))
      const newDates = new Set(selectedDates)
      const cur = new Date(start)
      while (cur <= end) {
        const dow = dowMonday(cur)
        if (dow <= 6) newDates.add(toISO(cur))  // Mon-Sat
        cur.setDate(cur.getDate() + 1)
      }
      setSelectedDates(newDates)
      setRangeStart(null)
    }
  }

  function toggleHalfDay(iso: string) {
    setHalfDays(prev => {
      const n = new Set(prev)
      n.has(iso) ? n.delete(iso) : n.add(iso)
      return n
    })
  }

  function removeDay(iso: string) {
    setSelectedDates(prev => { const n = new Set(prev); n.delete(iso); return n })
    setHalfDays(prev => { const n = new Set(prev); n.delete(iso); return n })
  }

  function clearAll() {
    setSelectedDates(new Set())
    setHalfDays(new Set())
    setRangeStart(null)
  }

  // Compute giorni structure from selected dates
  const giorniStruttura = useMemo(() => buildGiorni(selectedDates, halfDays), [selectedDates, halfDays])

  // Group by settimana_numero for the sidebar
  const settimaneMap = useMemo(() => {
    const m = new Map<number, typeof giorniStruttura>()
    for (const g of giorniStruttura) {
      const list = m.get(g.settimana_numero) ?? []
      list.push(g)
      m.set(g.settimana_numero, list)
    }
    return m
  }, [giorniStruttura])

  const maxSettimana = giorniStruttura.length > 0
    ? Math.max(...giorniStruttura.map(g => g.settimana_numero))
    : 0

  async function handleApplica() {
    setSaving(true)
    const payload = giorniStruttura.map(({ isoDate: _, ...g }) => g)  // strip isoDate
    const res = await fetch(`/api/template/${templateId}/giorni`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bulk: true, giorni: payload }),
    })
    const json = await res.json()
    if (json.giorni) {
      onGiorniChange(json.giorni)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      {/* Calendar navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setPageOffset(p => p - 3)}
          className="p-1.5 rounded-lg hover:bg-navy/10 transition"
          style={{ color: 'rgba(27,55,104,0.5)' }}>
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-medium" style={{ color: '#1B3768' }}>
          {rangeStart
            ? `Seleziona il giorno finale (inizio: ${rangeStart})`
            : `Clicca il primo giorno di un blocco per iniziare`}
        </span>
        <button onClick={() => setPageOffset(p => p + 3)}
          className="p-1.5 rounded-lg hover:bg-navy/10 transition"
          style={{ color: 'rgba(27,55,104,0.5)' }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 3 month grids */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {months.map(({ year, month }) => {
          const label = new Date(year, month, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
          const grid = buildMonthGrid(year, month)
          return (
            <div key={`${year}-${month}`} className="space-y-1">
              <p className="text-xs font-semibold text-center capitalize" style={{ color: '#1B3768' }}>{label}</p>
              {/* Day headers */}
              <div className="grid grid-cols-6 gap-0.5">
                {GIORNI_SETTIMANA.map(d => (
                  <div key={d} className="text-center text-xs font-medium py-1"
                    style={{ color: 'rgba(27,55,104,0.4)' }}>{d}</div>
                ))}
              </div>
              {/* Weeks */}
              {grid.map((week, wi) => (
                <div key={wi} className="grid grid-cols-6 gap-0.5">
                  {week.map((date, di) => {
                    if (!date) return <div key={di} />
                    const iso = toISO(date)
                    const isSelected = selectedDates.has(iso)
                    const isStart    = rangeStart === iso
                    const isHalf     = halfDays.has(iso)
                    return (
                      <button
                        key={di}
                        onClick={() => handleDayClick(iso)}
                        className="relative h-7 w-full rounded text-xs font-medium transition-colors"
                        style={{
                          background: isStart    ? '#f59e0b'
                            : isSelected ? '#1EB8E5'
                            : 'rgba(27,55,104,0.04)',
                          color: (isSelected || isStart) ? 'white' : '#1B3768',
                          border: isStart ? '2px solid #d97706' : 'none',
                        }}>
                        {date.getDate()}
                        {isHalf && (
                          <span className="absolute bottom-0.5 right-0.5 text-[8px] leading-none"
                            style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : '#f59e0b' }}>½</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Summary sidebar / panel */}
      {giorniStruttura.length > 0 && (
        <div className="rounded-xl p-3 space-y-2"
          style={{ background: 'rgba(27,55,104,0.04)', border: '1px solid rgba(27,55,104,0.08)' }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold" style={{ color: '#1B3768' }}>
              Struttura ({giorniStruttura.length} giornate, {maxSettimana} settimane)
            </p>
            <button onClick={clearAll} className="text-xs" style={{ color: 'rgba(27,55,104,0.4)' }}>
              Cancella tutto
            </button>
          </div>
          <div className="space-y-1.5">
            {[...settimaneMap.entries()].sort(([a], [b]) => a - b).map(([wn, days]) => (
              <div key={wn} className="flex items-start gap-2">
                <span className="text-xs font-semibold flex-shrink-0 w-8 mt-0.5"
                  style={{ color: 'rgba(27,55,104,0.5)' }}>S{wn}</span>
                <div className="flex flex-wrap gap-1">
                  {days.sort((a, b) => a.giorno_settimana - b.giorno_settimana).map(day => (
                    <div key={day.isoDate}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                      style={{ background: 'rgba(30,184,229,0.12)', color: '#1B3768' }}>
                      <span>{GIORNI_SETTIMANA[(day.giorno_settimana - 1)]}</span>
                      <button onClick={() => toggleHalfDay(day.isoDate)}
                        className="font-bold" title="Mezza giornata"
                        style={{ color: halfDays.has(day.isoDate) ? '#f59e0b' : 'rgba(27,55,104,0.3)' }}>
                        ½
                      </button>
                      <button onClick={() => removeDay(day.isoDate)}
                        className="text-[10px] leading-none" style={{ color: 'rgba(27,55,104,0.3)' }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleApplica}
          disabled={saving || giorniStruttura.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition"
          style={{
            backgroundColor: saved ? '#22c55e' : saving ? 'rgba(30,184,229,0.5)'
              : giorniStruttura.length === 0 ? 'rgba(27,55,104,0.2)' : '#1EB8E5',
            cursor: giorniStruttura.length === 0 ? 'not-allowed' : 'pointer',
          }}>
          <Check size={14} />
          {saved ? 'Struttura applicata!' : saving ? 'Salvataggio...' : 'Applica struttura'}
        </button>
        {giorniStruttura.length > 0 && (
          <span className="text-xs" style={{ color: 'rgba(27,55,104,0.5)' }}>
            <Clock size={11} className="inline mr-1" />
            {giorniStruttura.length} giornate selezionate
          </span>
        )}
      </div>

      <p className="text-xs" style={{ color: 'rgba(27,55,104,0.35)' }}>
        ⓘ Le date nel calendario sono solo un riferimento visivo. Il template salva la struttura
        (es. Settimana 1: Lun–Mer), non le date specifiche.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```

Fix any errors (common: `Date | null` in grid cells, unused imports).

- [ ] **Step 3: Commit**

```bash
git add components/template/CalendarioBuilder.tsx
git commit -m "feat: CalendarioBuilder — visual calendar range selector for template structure"
```

---

## Task 8: Build SettimaneFasceEditor Component

**Files:**
- Create: `components/template/SettimaneFasceEditor.tsx`

This component shows the giorni (with giorno_settimana + settimana_numero) grouped by settimana, and lets the admin configure fasce orarie for each day. Includes break-type support.

- [ ] **Step 1: Create SettimaneFasceEditor.tsx**

```tsx
'use client'

import { useState } from 'react'
import { Plus, Trash2, Coffee, Utensils, Moon } from 'lucide-react'
import FasciaRow, { defaultNewFascia } from './FasciaRow'
import type { TemplateGiorno, TemplateFascia, Area } from '@/lib/types'

interface Props {
  templateId: string
  giorni: TemplateGiorno[]
  aree: Area[]
  onGiorniChange: (giorni: TemplateGiorno[]) => void
}

const DOW_LABEL = ['', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
const PAUSA_OPTIONS = [
  { value: null,     label: 'Lezione',  icon: null },
  { value: 'caffe',  label: 'Pausa caffè', icon: Coffee },
  { value: 'pranzo', label: 'Pausa pranzo', icon: Utensils },
  { value: 'cena',   label: 'Pausa cena',   icon: Moon },
]

export default function SettimaneFasceEditor({ templateId, giorni, aree, onGiorniChange }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggleCollapse(id: string) {
    setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // Group giorni by settimana_numero
  const settimaneMap = new Map<number, TemplateGiorno[]>()
  for (const g of giorni) {
    const wn = g.settimana_numero ?? 0
    const list = settimaneMap.get(wn) ?? []
    list.push(g)
    settimaneMap.set(wn, list)
  }
  const settimane = [...settimaneMap.entries()].sort(([a], [b]) => a - b)

  async function addFascia(giorno: TemplateGiorno) {
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
  }

  async function addPausa(giorno: TemplateGiorno, tipo_pausa: string) {
    const { ora_inizio, ora_fine } = defaultNewFascia(giorno.fasce ?? [])
    const labelMap: Record<string, string> = { caffe: 'Pausa caffè', pranzo: 'Pausa pranzo', cena: 'Pausa cena' }
    const res = await fetch(`/api/template/${templateId}/fasce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ giorno_id: giorno.id, ora_inizio, ora_fine, materia: labelMap[tipo_pausa] ?? '', tipo_pausa }),
    })
    const json = await res.json()
    if (json.fascia) {
      onGiorniChange(giorni.map(g =>
        g.id === giorno.id ? { ...g, fasce: [...(g.fasce ?? []), json.fascia] } : g
      ))
    }
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

  if (giorni.length === 0) {
    return (
      <p className="text-xs text-center py-4" style={{ color: 'rgba(27,55,104,0.4)' }}>
        Prima seleziona la struttura nel calendario qui sopra
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {settimane.map(([wn, giorni_settimana]) => (
        <div key={wn} className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'rgba(27,55,104,0.12)' }}>
          <div className="px-3 py-2 text-xs font-semibold"
            style={{ background: 'rgba(27,55,104,0.05)', color: '#1B3768' }}>
            Settimana {wn}
            {wn !== Math.ceil(wn) ? '' : ''}
          </div>

          <div className="px-3 py-2 space-y-2">
            {[...giorni_settimana].sort((a, b) => (a.giorno_settimana ?? 0) - (b.giorno_settimana ?? 0)).map(giorno => {
              const dowLabel = DOW_LABEL[giorno.giorno_settimana ?? 0] ?? `Giorno ${giorno.numero}`
              const isCollapsed = collapsed.has(giorno.id)
              return (
                <div key={giorno.id} className="rounded-lg border overflow-hidden"
                  style={{ borderColor: 'rgba(27,55,104,0.08)' }}>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer select-none"
                    style={{ background: 'rgba(27,55,104,0.03)' }}
                    onClick={() => toggleCollapse(giorno.id)}>
                    <span className="text-xs font-medium" style={{ color: '#1B3768' }}>
                      {dowLabel}
                      {giorno.is_mezza_giornata && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(245,158,11,0.15)', color: '#d97706' }}>
                          ½ giornata
                        </span>
                      )}
                    </span>
                    <span className="text-xs ml-auto" style={{ color: 'rgba(27,55,104,0.35)' }}>
                      {(giorno.fasce ?? []).length} fasce
                    </span>
                  </div>

                  {!isCollapsed && (
                    <div className="px-2.5 py-1.5 space-y-1">
                      {(giorno.fasce ?? []).map(f => (
                        <div key={f.id} className="flex items-center gap-1">
                          {f.tipo_pausa && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: 'rgba(245,158,11,0.15)', color: '#d97706' }}>
                              {f.tipo_pausa === 'caffe' ? '☕' : f.tipo_pausa === 'pranzo' ? '🍽️' : '🌙'}
                            </span>
                          )}
                          <div className="flex-1">
                            <FasciaRow
                              fascia={f}
                              aree={aree}
                              onUpdate={(id, fields) => updateFascia(giorno.id, id, fields as Partial<TemplateFascia>)}
                              onDelete={(id) => deleteFascia(giorno.id, id)}
                            />
                          </div>
                        </div>
                      ))}

                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          onClick={() => addFascia(giorno)}
                          className="flex items-center gap-1 text-xs font-medium"
                          style={{ color: '#1EB8E5' }}>
                          <Plus size={11} /> Fascia
                        </button>
                        <span style={{ color: 'rgba(27,55,104,0.2)' }}>|</span>
                        {[
                          { tipo: 'caffe', icon: '☕', label: 'Caffè' },
                          { tipo: 'pranzo', icon: '🍽️', label: 'Pranzo' },
                          { tipo: 'cena', icon: '🌙', label: 'Cena' },
                        ].map(p => (
                          <button key={p.tipo}
                            onClick={() => addPausa(giorno, p.tipo)}
                            className="flex items-center gap-0.5 text-xs"
                            style={{ color: 'rgba(27,55,104,0.4)' }}>
                            {p.icon} {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add components/template/SettimaneFasceEditor.tsx
git commit -m "feat: SettimaneFasceEditor — fasce editor for calendar-structured templates"
```

---

## Task 9: Update TemplateEditorClient

**Files:**
- Modify: `app/(dashboard)/super-admin/corsi/template/[id]/TemplateEditorClient.tsx`

Add:
1. `ore_totali` number field in the "Informazioni base" card
2. `'calendario'` option in the struttura_tipo toggle (3 buttons: giorni | moduli | calendario)
3. When `strutturaTipo === 'calendario'`: show `<CalendarioBuilder>` for structure + `<SettimaneFasceEditor>` for fasce + `<OrarioCounter>` at top of the calendar section
4. Pass `ore_totali` to `OrarioCounter`

- [ ] **Step 1: Add imports**

At the top of `TemplateEditorClient.tsx`, add:
```typescript
import CalendarioBuilder from '@/components/template/CalendarioBuilder'
import SettimaneFasceEditor from '@/components/template/SettimaneFasceEditor'
import OrarioCounter from '@/components/template/OrarioCounter'
```

- [ ] **Step 2: Add ore_totali state**

After the existing state declarations, add:
```typescript
const [oreTotali, setOreTotali] = useState<string>(
  template.ore_totali != null ? String(template.ore_totali) : ''
)
```

And in the state for strutturaTipo, update the type:
```typescript
const [strutturaTipo, setStrutturaTipo] = useState<'giorni' | 'moduli' | 'calendario'>(
  (template.struttura_tipo ?? 'giorni') as 'giorni' | 'moduli' | 'calendario'
)
```

- [ ] **Step 3: Update handleSave to include ore_totali**

In the `handleSave` function body, update the JSON.stringify:
```typescript
body: JSON.stringify({
  nome,
  tipologia: tipologia || null,
  struttura_tipo: strutturaTipo,
  materiali_tags: materialiTags,
  quiz_tags: quizTags,
  parametri: { ...template.parametri, tipo_corso: tipoCorsoProp },
  ore_totali: oreTotali !== '' ? parseFloat(oreTotali) : null,
}),
```

- [ ] **Step 4: Update handleSwitchStruttura type**

Change the function signature:
```typescript
async function handleSwitchStruttura(to: 'giorni' | 'moduli' | 'calendario') {
```

- [ ] **Step 5: Add ore_totali field to "Informazioni base" card**

After the `<select>` for tipologia, add a new input field for ore_totali (on a new row):

```tsx
<div className="flex items-center gap-3">
  <label className="text-xs font-medium flex-shrink-0" style={{ color: 'rgba(27,55,104,0.6)' }}>
    Ore totali corso
  </label>
  <input
    type="number"
    min="1"
    max="999"
    step="0.5"
    placeholder="es. 120"
    value={oreTotali}
    onChange={e => setOreTotali(e.target.value)}
    className="w-28 rounded-xl px-3 py-2 text-sm border bg-white focus:outline-none focus:ring-2"
    style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}
  />
  <span className="text-xs" style={{ color: 'rgba(27,55,104,0.4)' }}>ore di lezione</span>
</div>
```

- [ ] **Step 6: Update the struttura_tipo toggle to include 'calendario'**

In the "Struttura calendario" card header, change the toggle from:
```tsx
{(['giorni', 'moduli'] as const).map(s => (
```
to:
```tsx
{(['giorni', 'moduli', 'calendario'] as const).map(s => (
  <button key={s} type="button"
    onClick={() => { if (s !== strutturaTipo) handleSwitchStruttura(s) }}
    className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition"
    style={{
      background: strutturaTipo === s ? '#1B3768' : 'transparent',
      color: strutturaTipo === s ? 'white' : 'rgba(27,55,104,0.5)',
    }}>
    {s === 'calendario' ? '📅 calendario' : s}
  </button>
))}
```

- [ ] **Step 7: Add the calendario branch to the editor render**

After the existing `if (strutturaTipo === 'giorni') ... else (ModuliEditor)`, add a third branch. Replace the ternary with an if-else chain in JSX:

```tsx
{strutturaTipo === 'giorni' ? (
  <GiorniEditor
    templateId={template.id}
    giorni={giorni}
    aree={aree}
    onGiorniChange={setGiorni}
  />
) : strutturaTipo === 'moduli' ? (
  <ModuliEditor
    templateId={template.id}
    moduli={moduli}
    aree={aree}
    onModuliChange={setModuli}
  />
) : (
  /* strutturaTipo === 'calendario' */
  <div className="space-y-4">
    <OrarioCounter
      oreTotali={oreTotali !== '' ? parseFloat(oreTotali) : null}
      giorni={giorni}
    />
    <div>
      <p className="text-xs font-semibold mb-2" style={{ color: '#1B3768' }}>
        1. Seleziona la struttura delle settimane
      </p>
      <CalendarioBuilder
        templateId={template.id}
        giorni={giorni}
        onGiorniChange={setGiorni}
      />
    </div>
    {giorni.length > 0 && (
      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: '#1B3768' }}>
          2. Configura le fasce orarie
        </p>
        <SettimaneFasceEditor
          templateId={template.id}
          giorni={giorni}
          aree={aree}
          onGiorniChange={setGiorni}
        />
      </div>
    )}
  </div>
)}
```

- [ ] **Step 8: TypeScript check**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```

Fix any type errors.

- [ ] **Step 9: Build check**

```bash
cd "/Users/alessandrodanti/Documents/Claude Workspace/CoachLab LMS/web-app"
npm run build 2>&1 | tail -20
```

Fix any build errors.

- [ ] **Step 10: Commit**

```bash
git add "app/(dashboard)/super-admin/corsi/template/[id]/TemplateEditorClient.tsx"
git commit -m "feat: template editor — calendario mode with CalendarioBuilder + SettimaneFasceEditor + OrarioCounter"
```

---

## Task 10: Update Applica Route for Calendar Structure

**Files:**
- Modify: `app/api/template/applica/route.ts`

When a template has `struttura_tipo = 'calendario'`, the giorni have `giorno_settimana` and `settimana_numero`. The date mapping must use these fields instead of sequential numbering.

**Logic:** For each giorno with `settimana_numero` and `giorno_settimana`:
```
actual_date = start_date + (settimana_numero - 1) * 7 + (giorno_settimana - 1) days
```

The existing sequential logic (using `calcolaDateCorso`) is kept for `struttura_tipo = 'giorni'` and `'moduli'`.

- [ ] **Step 1: Read the current applica route**

Read `app/api/template/applica/route.ts` fully to understand the current flow. (The content is available from the session context above.)

- [ ] **Step 2: Add calendar-mode date calculation**

After the existing date calculation section (comment `// 2. Calcola date reali`), add a conditional branch. The current code uses:
```typescript
const dates = calcolaDateCorso(start_date, nGiorni, { skipSabato: skip_sabato ?? false })
```

Replace this section with:

```typescript
// 2. Calcola date reali
const hasCalendarStructure = (template.struttura_tipo as string) === 'calendario'
  && giorniWithFasce.some(g => (g as Record<string, unknown>).giorno_settimana != null)

let dates: Date[]

if (hasCalendarStructure) {
  // Calendar mode: map via settimana_numero + giorno_settimana
  const startDate = new Date(start_date + 'T12:00:00')
  dates = giorniWithFasce.map(g => {
    const gRec = g as Record<string, unknown>
    const settimana = (gRec.settimana_numero as number) ?? 1
    const dow      = (gRec.giorno_settimana  as number) ?? 1  // 1=Mon
    const dayOffset = (settimana - 1) * 7 + (dow - 1)
    const d = new Date(startDate)
    d.setDate(d.getDate() + dayOffset)
    return d
  })
} else {
  // Sequential mode (giorni / moduli templates)
  if (nGiorni === 0) return NextResponse.json({ error: 'Il template non ha giorni' }, { status: 400 })
  dates = calcolaDateCorso(start_date, nGiorni, { skipSabato: skip_sabato ?? false })
}
```

Note: Remove the `if (nGiorni === 0)` check that was below the old dates line — it's now inside the else branch.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | tail -15
```

- [ ] **Step 5: Commit**

```bash
git add app/api/template/applica/route.ts
git commit -m "feat: applica route — support calendar-structure templates (giorno_settimana + settimana_numero)"
```

---

## Task 11: Also update the server page to pass ore_totali

**Files:**
- Modify: `app/(dashboard)/super-admin/corsi/template/[id]/page.tsx`

The server page fetches the template with `select('*')` which already includes `ore_totali`. However `CourseTemplateCompleto` needs to expose it. Verify no cast strips it.

- [ ] **Step 1: Verify the page passes ore_totali correctly**

In `page.tsx`, the `templateCompleto` object is spread from `template`:
```typescript
const templateCompleto = {
  ...template,
  struttura_tipo: (template.struttura_tipo ?? 'giorni') as 'giorni' | 'moduli',
  ...
}
```

Update the cast to include `'calendario'`:
```typescript
struttura_tipo: (template.struttura_tipo ?? 'giorni') as 'giorni' | 'moduli' | 'calendario',
```

And `ore_totali` comes through via `...template` automatically since `select('*')` fetches all columns.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```

- [ ] **Step 3: Final build**

```bash
npm run build 2>&1 | tail -20
```

Expected: ✓ Compiled successfully.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/super-admin/corsi/template/[id]/page.tsx"
git commit -m "feat: template page — include 'calendario' in struttura_tipo cast"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|-------------|------|
| Calendar UI with real dates | Task 7 (CalendarioBuilder) |
| Saves structure not dates | Task 7 (buildGiorni extracts giorno_settimana/settimana_numero) |
| Range selection (hotel-style) | Task 7 (rangeStart state) |
| Multiple week blocks | Task 7 (accumulated selectedDates across clicks) |
| Half-day (mezza giornata) | Task 7 (halfDays Set + toggleHalfDay), Task 3 (DB column) |
| Free week patterns (pause weeks) | Task 7 (buildGiorni uses week key gaps) |
| Hours counter with ore_totali | Task 6 (OrarioCounter), Task 5 (API), Task 9 (UI field) |
| Break types (caffè/pranzo/cena) | Task 8 (SettimaneFasceEditor addPausa), Task 4 (API) |
| Existing editor kept for courses | Not touched — backward compatible |
| Apply-template works with new structure | Task 10 (applica route calendar branch) |

### Type Consistency Check

- `struttura_tipo: 'giorni' | 'moduli' | 'calendario'` — updated in types.ts (Task 2), TemplateEditorClient (Task 9), page.tsx (Task 11)
- `TemplateGiorno.giorno_settimana: number | null` — used in CalendarioBuilder (Task 7), SettimaneFasceEditor (Task 8), applica route (Task 10) ✓
- `onGiorniChange(giorni: TemplateGiorno[])` — same signature across GiorniEditor, CalendarioBuilder, SettimaneFasceEditor ✓
- `bulk-replace PUT` payload uses `giorno_settimana, settimana_numero, is_mezza_giornata, numero, titolo` — matches Task 3 API ✓
- `calcolaOreUsate` exported from OrarioCounter — not used elsewhere in this plan ✓

### Placeholder Scan

All steps have actual code. No TBDs found.

---

**Plan saved.** Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, spec review + code quality review between tasks

**2. Inline Execution** — execute tasks in this session with checkpoints

Which approach?
