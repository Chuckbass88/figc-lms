# Stream B — Feature e Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eseguire DB audit, aggiungere il ruolo admin con permessi granulari, implementare Archivio Generale per aree, Template Corsi con calendario e materie, Calendari aggregati, PDF miglioramenti e rename Quiz→Esami.

**Architecture:** Tutte le migration Supabase vengono eseguite manualmente nel SQL Editor di Supabase (non CLI). Le nuove route Next.js seguono il pattern esistente: page server component + Client component separato. Le API route usano Supabase server client (`@supabase/ssr`). Il worktree è `feature/new-features`.

**Tech Stack:** Next.js 16 App Router, Supabase PostgreSQL + Storage, TypeScript, Tailwind CSS v4. Dev server: `localhost:3001`. SQL eseguito su Supabase SQL Editor (non migrate CLI).

---

## File Map

**Migrations (SQL Editor Supabase):**
- `M1` — Rename quiz UI labels (nessuna migration DB)
- `M2` — ALTER profiles role constraint + admin_permissions
- `M3` — CREATE aree + docente_aree
- `M4` — ALTER courses (cu_number, cu_url, regione, tipo_corso, area_id)
- `M5` — CREATE archivio_generale + corso_archivio
- `M6` — CREATE course_templates
- `M7` — CREATE corso_eventi + corso_eventi_docenti

**Route nuove:**
- `app/(dashboard)/super-admin/archivio-generale/page.tsx`
- `app/(dashboard)/super-admin/archivio-generale/ArchivioPaginaClient.tsx`
- `app/(dashboard)/super-admin/corsi/template/page.tsx`
- `app/(dashboard)/super-admin/corsi/template/TemplateListClient.tsx`
- `app/(dashboard)/super-admin/corsi/template/nuovo/page.tsx`
- `app/(dashboard)/super-admin/corsi/template/[id]/page.tsx`
- `app/(dashboard)/super-admin/utenti/admin/page.tsx` (o filtro su utenti esistenti)
- `app/(dashboard)/super-admin/utenti/[id]/permessi/page.tsx`
- `app/(dashboard)/super-admin/calendari/page.tsx`
- `app/(dashboard)/super-admin/calendari/CalendariClient.tsx`
- `app/(dashboard)/docente/archivio/page.tsx`
- `app/(dashboard)/docente/archivio/ArchivioDocenteClient.tsx`
- `app/(dashboard)/docente/corsi/[id]/archivio/page.tsx`
- `app/(dashboard)/studente/corsi/[id]/archivio/page.tsx`
- `app/api/archivio/upload/route.ts`
- `app/api/archivio/applica/route.ts`
- `app/api/archivio/toggle/route.ts`
- `app/api/admin/permessi/route.ts`
- `app/api/admin/permessi/[userId]/route.ts`
- `app/api/corso-eventi/genera/route.ts`
- `app/api/corso-eventi/[eventoId]/docente/route.ts`

**File modificati:**
- `lib/types.ts` — aggiungere tipi per nuove entità
- `app/(dashboard)/super-admin/corsi/nuovo/page.tsx` — aggiungere step template
- `app/(dashboard)/super-admin/corsi/[id]/gestione/page.tsx` — aggiungere campi cu_number, cu_url, regione, tipo_corso
- `app/(dashboard)/docente/corsi/[id]/programma/export-pdf/route.tsx` — copertina + grafica migliorata
- `app/(dashboard)/super-admin/corsi/[id]/programma/export-pdf/route.tsx` — stesse migliorie
- `components/programma/ProgrammaEditor.tsx` — aggiungere pulsante preview PDF con modal

---

## Task B1: Rename Quiz → Esami e Prove Intermedie (UI only)

**Files:** Tutti i file con label "Quiz" visibile nell'UI

- [ ] **Step 1: Trovare tutte le occorrenze UI da rinominare**

```bash
cd ~/figc-lms && grep -r "Quiz" --include="*.tsx" --include="*.ts" -l | grep -v node_modules | grep -v ".next" | sort
```

- [ ] **Step 2: Grep delle stringhe label visibili (NON route/componenti)**

```bash
grep -r '"Quiz"' --include="*.tsx" ~/figc-lms/app ~/figc-lms/components | grep -v node_modules
grep -r "'Quiz'" --include="*.tsx" ~/figc-lms/app ~/figc-lms/components | grep -v node_modules
grep -r "I Miei Quiz\|Libreria Quiz\|quiz recenti\|I miei quiz" --include="*.tsx" -i ~/figc-lms/app ~/figc-lms/components | grep -v node_modules
```

- [ ] **Step 3: Rinominare manualmente i label trovati**

Per ogni file trovato, modificare solo i testi UI visibili:
- `"Quiz"` → `"Esami e Prove Intermedie"` (o abbreviato `"Esami e Prove Int."` dove lo spazio è limitato)
- `"Libreria Quiz"` → `"Libreria Esami"`
- `"I Miei Quiz"` → `"I Miei Esami"`
- `"quiz"` (minuscolo come label) → `"esame"` / `"esami"`

**NON modificare:** nomi file, URL route (`/quiz`, `/libreria-quiz`), nomi tabelle DB (`quiz`, `quiz_templates`), nomi variabili/funzioni TypeScript.

- [ ] **Step 4: Verificare visivamente**

```bash
npm run dev
```

Navigare su `/docente/libreria-quiz` e `/studente/quiz` — i titoli delle pagine devono mostrare "Esami" ma le URL rimangono invariate.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: rinomina Quiz → Esami e Prove Intermedie (solo label UI)"
```

---

## Task B2: Migration DB — Admin role + admin_permissions

**Files:** SQL Editor Supabase

- [ ] **Step 1: Aprire Supabase SQL Editor**

Andare su `https://supabase.com/dashboard` → progetto CoachLab → SQL Editor.

- [ ] **Step 2: Eseguire migration M2 — Admin role**

```sql
-- M2a: Aggiunge 'admin' al constraint del ruolo
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'docente', 'studente'));

-- M2b: Crea tabella permessi granulari per admin
CREATE TABLE IF NOT EXISTS admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(admin_user_id, permission_key)
);

-- Indice per lookup rapido per utente
CREATE INDEX IF NOT EXISTS idx_admin_permissions_user ON admin_permissions(admin_user_id);

-- RLS
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- super_admin può vedere e modificare tutti i permessi
CREATE POLICY "super_admin_manage_permissions" ON admin_permissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- admin può leggere i propri permessi
CREATE POLICY "admin_read_own_permissions" ON admin_permissions
  FOR SELECT USING (admin_user_id = auth.uid());
```

- [ ] **Step 3: Verificare che la migration sia andata a buon fine**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'role';

SELECT * FROM admin_permissions LIMIT 1;
```

Expected: la colonna `role` esiste, la tabella `admin_permissions` esiste senza errori.

- [ ] **Step 4: Aggiornare `lib/types.ts` con i nuovi tipi**

```typescript
// Aggiungere in lib/types.ts

export const ADMIN_PERMISSIONS = [
  'template_corsi',
  'archivio_globale_write',
  'archivio_globale_read',
  'gestione_admin',
  'import_utenti',
  'export_globale',
  'configurazioni_sistema',
  'report_globale',
] as const

export type AdminPermissionKey = typeof ADMIN_PERMISSIONS[number]

export const ADMIN_PERMISSION_LABELS: Record<AdminPermissionKey, string> = {
  template_corsi: 'Gestione Template Corsi',
  archivio_globale_write: 'Archivio Globale — Caricamento',
  archivio_globale_read: 'Archivio Globale — Lettura',
  gestione_admin: 'Gestione altri Admin',
  import_utenti: 'Importazione massiva utenti',
  export_globale: 'Export CSV globale',
  configurazioni_sistema: 'Configurazioni di sistema',
  report_globale: 'Report presenze globale',
}

export interface AdminPermission {
  id: string
  admin_user_id: string
  permission_key: AdminPermissionKey
  enabled: boolean
  updated_at: string
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts
git commit -m "feat: DB migration admin role e admin_permissions + tipi TS"
```

---

## Task B3: Migration DB — Aree disciplinari

- [ ] **Step 1: Eseguire migration M3 nel SQL Editor Supabase**

```sql
-- M3: Aree disciplinari
CREATE TABLE IF NOT EXISTS aree (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descrizione text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Associazione docente ↔ aree (molti-a-molti)
CREATE TABLE IF NOT EXISTS docente_aree (
  docente_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES aree(id) ON DELETE CASCADE,
  PRIMARY KEY (docente_id, area_id)
);

CREATE INDEX IF NOT EXISTS idx_docente_aree_docente ON docente_aree(docente_id);
CREATE INDEX IF NOT EXISTS idx_docente_aree_area ON docente_aree(area_id);

-- RLS aree
ALTER TABLE aree ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tutti_leggono_aree" ON aree FOR SELECT USING (true);
CREATE POLICY "admin_gestisce_aree" ON aree FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

-- RLS docente_aree
ALTER TABLE docente_aree ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tutti_leggono_docente_aree" ON docente_aree FOR SELECT USING (true);
CREATE POLICY "admin_gestisce_docente_aree" ON docente_aree FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

-- Dati iniziali aree esempio (modificabili da super_admin)
INSERT INTO aree (nome, descrizione) VALUES
  ('Psicologia dello Sport', 'Aspetti psicologici della performance'),
  ('Regolamento di Gioco', 'Regole FIFA e interpretazioni arbitrali'),
  ('Preparazione Atletica', 'Metodologie di allenamento fisico'),
  ('Tattica', 'Sistemi di gioco e analisi tattica'),
  ('Medicina Sportiva', 'Prevenzione infortuni e primo soccorso')
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Aggiungere tipi in `lib/types.ts`**

```typescript
export interface Area {
  id: string
  nome: string
  descrizione: string | null
  created_at: string
}

export interface DocenteArea {
  docente_id: string
  area_id: string
  area?: Area
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: DB migration aree disciplinari + docente_aree"
```

---

## Task B4: Migration DB — Nuovi campi courses + archivio

- [ ] **Step 1: Eseguire migration M4 — ALTER courses**

```sql
-- M4: Nuovi campi corsi
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS cu_number text,
  ADD COLUMN IF NOT EXISTS cu_url text,
  ADD COLUMN IF NOT EXISTS regione text,
  ADD COLUMN IF NOT EXISTS tipo_corso text CHECK (tipo_corso IN ('centrale', 'periferico')),
  ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES aree(id);

CREATE INDEX IF NOT EXISTS idx_courses_regione ON courses(regione);
CREATE INDEX IF NOT EXISTS idx_courses_tipo ON courses(tipo_corso);
```

- [ ] **Step 2: Eseguire migration M5 — Archivio Generale**

```sql
-- M5a: Archivio generale documenti
CREATE TABLE IF NOT EXISTS archivio_generale (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  tipo text CHECK (tipo IN ('PDF', 'PPTX', 'DOC', 'XLSX', 'ALTRO')),
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  corso_origine_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  area_id uuid REFERENCES aree(id) ON DELETE SET NULL,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_archivio_area ON archivio_generale(area_id);
CREATE INDEX IF NOT EXISTS idx_archivio_corso ON archivio_generale(corso_origine_id);

-- M5b: Associazione archivio ↔ corso (abilitazione per corso)
CREATE TABLE IF NOT EXISTS corso_archivio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archivio_id uuid NOT NULL REFERENCES archivio_generale(id) ON DELETE CASCADE,
  corso_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  abilitato boolean NOT NULL DEFAULT true,
  added_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(archivio_id, corso_id)
);

CREATE INDEX IF NOT EXISTS idx_corso_archivio_corso ON corso_archivio(corso_id);

-- RLS archivio_generale
ALTER TABLE archivio_generale ENABLE ROW LEVEL SECURITY;

-- super_admin: accesso totale
CREATE POLICY "super_admin_archivio" ON archivio_generale FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);
-- admin con permesso write: può caricare
CREATE POLICY "admin_archivio_write" ON archivio_generale FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN admin_permissions ap ON ap.admin_user_id = p.id
    WHERE p.id = auth.uid() AND p.role = 'admin'
    AND ap.permission_key = 'archivio_globale_write' AND ap.enabled = true
  )
);
-- admin con permesso read: può leggere
CREATE POLICY "admin_archivio_read" ON archivio_generale FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    LEFT JOIN admin_permissions ap ON ap.admin_user_id = p.id
      AND ap.permission_key = 'archivio_globale_read' AND ap.enabled = true
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);
-- docente: legge solo file nella sua area
CREATE POLICY "docente_archivio_read" ON archivio_generale FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN docente_aree da ON da.docente_id = p.id
    WHERE p.id = auth.uid() AND p.role = 'docente'
    AND (archivio_generale.area_id = da.area_id OR archivio_generale.area_id IS NULL)
  )
);

-- RLS corso_archivio
ALTER TABLE corso_archivio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_corso_archivio" ON corso_archivio FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "docente_read_corso_archivio" ON corso_archivio FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM course_instructors ci
    WHERE ci.course_id = corso_archivio.corso_id AND ci.instructor_id = auth.uid()
  )
);
CREATE POLICY "studente_read_abilitati" ON corso_archivio FOR SELECT USING (
  abilitato = true AND EXISTS (
    SELECT 1 FROM course_enrollments ce
    WHERE ce.course_id = corso_archivio.corso_id AND ce.student_id = auth.uid()
  )
);
```

- [ ] **Step 3: Aggiornare `lib/types.ts`**

```typescript
export interface ArchiviFile {
  id: string
  nome: string
  file_url: string
  file_name: string
  file_size: number | null
  tipo: 'PDF' | 'PPTX' | 'DOC' | 'XLSX' | 'ALTRO' | null
  uploaded_by: string | null
  corso_origine_id: string | null
  area_id: string | null
  tags: string[]
  created_at: string
  area?: Area
  corso_origine?: Pick<Course, 'id' | 'name'>
}

export interface CorsoArchivio {
  id: string
  archivio_id: string
  corso_id: string
  abilitato: boolean
  added_by: string | null
  created_at: string
  file?: ArchiviFile
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts
git commit -m "feat: DB migration archivio_generale, corso_archivio, nuovi campi courses"
```

---

## Task B5: Migration DB — Templates + Calendario

- [ ] **Step 1: Eseguire migration M6 — course_templates**

```sql
-- M6: Template corsi
CREATE TABLE IF NOT EXISTS course_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipologia text,
  parametri jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE course_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_gestisce_templates" ON course_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "docente_legge_templates" ON course_templates FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'docente')
);

-- Template di esempio
INSERT INTO course_templates (nome, tipologia, parametri) VALUES (
  'UEFA A Standard',
  'UEFA A',
  '{
    "durata_giorni": 10,
    "tipo_corso": "centrale",
    "materie": [
      {"nome": "Psicologia dello Sport", "ore": 3, "area_nome": "Psicologia dello Sport"},
      {"nome": "Regolamento di Gioco", "ore": 4, "area_nome": "Regolamento di Gioco"},
      {"nome": "Tattica", "ore": 6, "area_nome": "Tattica"},
      {"nome": "Preparazione Atletica", "ore": 4, "area_nome": "Preparazione Atletica"}
    ],
    "calendario": {
      "giorni_settimana": ["lun", "mar", "mer", "gio", "ven"],
      "fasce_tipo": [
        {"inizio": "09:00", "fine": "11:00", "materia": "Psicologia dello Sport"},
        {"inizio": "11:15", "fine": "13:00", "materia": "Regolamento di Gioco"},
        {"inizio": "14:00", "fine": "17:00", "materia": "Tattica"}
      ]
    }
  }'::jsonb
);
```

- [ ] **Step 2: Eseguire migration M7 — corso_eventi**

```sql
-- M7: Calendario corso (eventi lezione)
CREATE TABLE IF NOT EXISTS corso_eventi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corso_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  materia text NOT NULL,
  area_id uuid REFERENCES aree(id) ON DELETE SET NULL,
  data date NOT NULL,
  ora_inizio time NOT NULL,
  ora_fine time NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corso_eventi_corso ON corso_eventi(corso_id);
CREATE INDEX IF NOT EXISTS idx_corso_eventi_data ON corso_eventi(data);

-- Docenti invitati a ogni evento
CREATE TABLE IF NOT EXISTS corso_eventi_docenti (
  evento_id uuid NOT NULL REFERENCES corso_eventi(id) ON DELETE CASCADE,
  docente_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stato text NOT NULL DEFAULT 'invitato' CHECK (stato IN ('invitato', 'confermato', 'declinato')),
  PRIMARY KEY (evento_id, docente_id)
);

CREATE INDEX IF NOT EXISTS idx_ced_docente ON corso_eventi_docenti(docente_id);

-- RLS corso_eventi
ALTER TABLE corso_eventi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_gestisce_eventi" ON corso_eventi FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "docente_legge_suoi_eventi" ON corso_eventi FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM corso_eventi_docenti ced
    WHERE ced.evento_id = corso_eventi.id AND ced.docente_id = auth.uid()
  )
);
CREATE POLICY "studente_legge_eventi_corso" ON corso_eventi FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM course_enrollments ce
    WHERE ce.course_id = corso_eventi.corso_id AND ce.student_id = auth.uid()
  )
);

-- RLS corso_eventi_docenti
ALTER TABLE corso_eventi_docenti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_gestisce_ced" ON corso_eventi_docenti FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "docente_legge_proprio_ced" ON corso_eventi_docenti FOR SELECT USING (
  docente_id = auth.uid()
);
```

- [ ] **Step 3: Aggiornare `lib/types.ts`**

```typescript
export interface CourseTemplate {
  id: string
  nome: string
  tipologia: string | null
  parametri: {
    durata_giorni?: number
    tipo_corso?: string
    materie?: Array<{ nome: string; ore: number; area_nome?: string }>
    calendario?: {
      giorni_settimana: string[]
      fasce_tipo: Array<{ inizio: string; fine: string; materia: string }>
    }
  }
  created_by: string | null
  created_at: string
}

export interface CorsoEvento {
  id: string
  corso_id: string
  materia: string
  area_id: string | null
  data: string        // 'YYYY-MM-DD'
  ora_inizio: string  // 'HH:MM:SS'
  ora_fine: string
  note: string | null
  created_at: string
  area?: Area
  docenti?: Array<{ docente_id: string; stato: string; profile?: Pick<Profile, 'id' | 'full_name'> }>
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts
git commit -m "feat: DB migration course_templates, corso_eventi, corso_eventi_docenti"
```

---

## Task B6: API — Archivio (upload, applica, toggle)

**Files:**
- Create: `app/api/archivio/upload/route.ts`
- Create: `app/api/archivio/applica/route.ts`
- Create: `app/api/archivio/toggle/route.ts`

- [ ] **Step 1: Creare `app/api/archivio/upload/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin', 'docente'].includes(profile.role)) {
    return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const nome = formData.get('nome') as string
  const area_id = formData.get('area_id') as string | null
  const corso_id = formData.get('corso_id') as string | null
  const tags = (formData.get('tags') as string | null)?.split(',').filter(Boolean) ?? []

  if (!file || !nome) {
    return NextResponse.json({ error: 'File e nome obbligatori' }, { status: 400 })
  }

  // Determina tipo file
  const ext = file.name.split('.').pop()?.toUpperCase()
  const tipo = ['PDF', 'PPTX', 'DOC', 'XLSX'].includes(ext ?? '') ? ext : 'ALTRO'

  // Upload su Supabase Storage
  const timestamp = Date.now()
  const storagePath = `archivio/${user.id}/${timestamp}_${file.name}`
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('course-materials')
    .upload(storagePath, arrayBuffer, { contentType: file.type })

  if (uploadError) {
    return NextResponse.json({ error: 'Errore upload: ' + uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('course-materials').getPublicUrl(storagePath)

  // Salva in archivio_generale
  const { data: archivioRecord, error: dbError } = await supabase
    .from('archivio_generale')
    .insert({
      nome,
      file_url: publicUrl,
      file_name: file.name,
      file_size: file.size,
      tipo: tipo as string,
      uploaded_by: user.id,
      corso_origine_id: corso_id ?? null,
      area_id: area_id ?? null,
      tags,
    })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: 'Errore DB: ' + dbError.message }, { status: 500 })
  }

  // Se il file viene caricato da un corso, abilitalo automaticamente per quel corso
  if (corso_id && archivioRecord) {
    await supabase.from('corso_archivio').insert({
      archivio_id: archivioRecord.id,
      corso_id,
      abilitato: true,
      added_by: user.id,
    })
  }

  return NextResponse.json({ success: true, file: archivioRecord })
}
```

- [ ] **Step 2: Creare `app/api/archivio/applica/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST: associa un file dell'archivio a un corso
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { archivio_id, corso_id } = await req.json()
  if (!archivio_id || !corso_id) {
    return NextResponse.json({ error: 'archivio_id e corso_id obbligatori' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('corso_archivio')
    .upsert({ archivio_id, corso_id, abilitato: true, added_by: user.id }, { onConflict: 'archivio_id,corso_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, record: data })
}
```

- [ ] **Step 3: Creare `app/api/archivio/toggle/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH: abilita/disabilita un file per un corso
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { corso_archivio_id, abilitato } = await req.json()
  if (!corso_archivio_id || typeof abilitato !== 'boolean') {
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('corso_archivio')
    .update({ abilitato })
    .eq('id', corso_archivio_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, record: data })
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/archivio/
git commit -m "feat: API routes archivio (upload, applica, toggle)"
```

---

## Task B7: UI — Archivio Generale (super_admin)

**Files:**
- Create: `app/(dashboard)/super-admin/archivio-generale/page.tsx`
- Create: `app/(dashboard)/super-admin/archivio-generale/ArchivioPaginaClient.tsx`

- [ ] **Step 1: Creare page server `app/(dashboard)/super-admin/archivio-generale/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ArchivioPaginaClient from './ArchivioPaginaClient'

export default async function ArchivioPaginaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: files }, { data: aree }] = await Promise.all([
    supabase
      .from('archivio_generale')
      .select('*, area:aree(id, nome), corso_origine:courses(id, name)')
      .order('created_at', { ascending: false }),
    supabase.from('aree').select('*').order('nome'),
  ])

  return <ArchivioPaginaClient files={files ?? []} aree={aree ?? []} />
}
```

- [ ] **Step 2: Creare `ArchivioPaginaClient.tsx`**

```tsx
'use client'
import { useState, useRef } from 'react'
import { Upload, FileText, Filter } from 'lucide-react'
import type { ArchiviFile, Area } from '@/lib/types'

export default function ArchivioPaginaClient({
  files, aree,
}: { files: ArchiviFile[]; aree: Area[] }) {
  const [filtroArea, setFiltroArea] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [uploading, setUploading] = useState(false)
  const [localFiles, setLocalFiles] = useState(files)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadForm, setUploadForm] = useState({
    nome: '', area_id: '', tags: '',
  })

  const filtrati = localFiles.filter(f => {
    if (filtroArea && f.area_id !== filtroArea) return false
    if (filtroTipo && f.tipo !== filtroTipo) return false
    return true
  })

  const tipi = [...new Set(localFiles.map(f => f.tipo).filter(Boolean))] as string[]

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file || !uploadForm.nome) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('nome', uploadForm.nome)
      if (uploadForm.area_id) fd.append('area_id', uploadForm.area_id)
      if (uploadForm.tags) fd.append('tags', uploadForm.tags)
      const res = await fetch('/api/archivio/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.success) {
        setLocalFiles(prev => [json.file, ...prev])
        setUploadForm({ nome: '', area_id: '', tags: '' })
        if (fileRef.current) fileRef.current.value = ''
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: '#1B3768' }}>Archivio Generale</h1>

      {/* Form upload */}
      <form onSubmit={handleUpload} className="rounded-2xl p-5 space-y-3"
        style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(27,55,104,0.1)' }}>
        <h2 className="text-sm font-semibold" style={{ color: '#1B3768' }}>Carica nuovo file</h2>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text" placeholder="Nome documento *" required
            value={uploadForm.nome} onChange={e => setUploadForm(p => ({ ...p, nome: e.target.value }))}
            className="rounded-xl px-3 py-2 text-sm border w-full"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}
          />
          <select
            value={uploadForm.area_id}
            onChange={e => setUploadForm(p => ({ ...p, area_id: e.target.value }))}
            className="rounded-xl px-3 py-2 text-sm border w-full"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}
          >
            <option value="">Nessuna area</option>
            {aree.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
        <div className="flex gap-3 items-center">
          <input ref={fileRef} type="file" accept=".pdf,.pptx,.doc,.docx,.xlsx"
            className="text-sm flex-1" required />
          <button type="submit" disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition"
            style={{ background: uploading ? 'rgba(8,145,178,0.5)' : '#0891B2' }}>
            <Upload size={15} />
            {uploading ? 'Caricamento...' : 'Carica'}
          </button>
        </div>
      </form>

      {/* Filtri */}
      <div className="flex gap-3 items-center">
        <Filter size={15} style={{ color: 'rgba(27,55,104,0.5)' }} />
        <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)}
          className="text-xs rounded-lg px-2 py-1.5 border"
          style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}>
          <option value="">Tutte le aree</option>
          {aree.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="text-xs rounded-lg px-2 py-1.5 border"
          style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }}>
          <option value="">Tutti i tipi</option>
          {tipi.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="text-xs ml-auto" style={{ color: 'rgba(27,55,104,0.5)' }}>
          {filtrati.length} file
        </span>
      </div>

      {/* Lista file per area */}
      {aree.map(area => {
        const areaFiles = filtrati.filter(f => f.area_id === area.id)
        if (filtroArea && filtroArea !== area.id) return null
        if (!filtroArea && areaFiles.length === 0) return null
        return (
          <div key={area.id} className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(27,55,104,0.1)', background: 'rgba(255,255,255,0.5)' }}>
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ background: 'rgba(27,55,104,0.04)', borderBottom: '1px solid rgba(27,55,104,0.08)' }}>
              <h3 className="text-sm font-semibold" style={{ color: '#1B3768' }}>{area.nome}</h3>
              <span className="text-xs" style={{ color: 'rgba(27,55,104,0.5)' }}>{areaFiles.length} file</span>
            </div>
            {areaFiles.map(f => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3 border-t"
                style={{ borderColor: 'rgba(27,55,104,0.06)' }}>
                <FileText size={16} style={{ color: '#0891B2', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#1B3768' }}>{f.nome}</p>
                  <p className="text-xs" style={{ color: 'rgba(27,55,104,0.5)' }}>
                    {f.tipo} · {f.file_size ? `${Math.round(f.file_size / 1024)}KB` : ''}
                    {f.corso_origine && ` · da: ${f.corso_origine.name}`}
                  </p>
                </div>
                <a href={f.file_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition"
                  style={{ background: 'rgba(8,145,178,0.08)', color: '#0891B2' }}>
                  Scarica
                </a>
              </div>
            ))}
          </div>
        )
      })}

      {/* File senza area */}
      {(() => {
        const senzaArea = filtrati.filter(f => !f.area_id)
        if (!filtroArea && senzaArea.length > 0) return (
          <div className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(27,55,104,0.1)', background: 'rgba(255,255,255,0.5)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(27,55,104,0.08)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'rgba(27,55,104,0.5)' }}>Senza area</h3>
            </div>
            {senzaArea.map(f => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3 border-t"
                style={{ borderColor: 'rgba(27,55,104,0.06)' }}>
                <FileText size={16} style={{ color: '#0891B2' }} />
                <p className="flex-1 text-sm truncate" style={{ color: '#1B3768' }}>{f.nome}</p>
                <a href={f.file_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg" style={{ color: '#0891B2' }}>Scarica</a>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
```

- [ ] **Step 3: Verificare la pagina**

```
http://localhost:3001/super-admin/archivio-generale
```

Expected: pagina carica, form upload visibile, sezioni per area.

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/super-admin/archivio-generale/
git commit -m "feat: pagina Archivio Generale super-admin con upload e filtri per area"
```

---

## Task B8: UI — Archivio per corso (docente + studente)

**Files:**
- Create: `app/(dashboard)/docente/corsi/[id]/archivio/page.tsx`
- Create: `app/(dashboard)/studente/corsi/[id]/archivio/page.tsx`

- [ ] **Step 1: Creare vista archivio corso docente**

```typescript
// app/(dashboard)/docente/corsi/[id]/archivio/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ArchivioCorsoDocenteClient from './ArchivioCorsoDocenteClient'

export default async function ArchivioCorsoDocentePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: fileCorso }, { data: corso }] = await Promise.all([
    supabase
      .from('corso_archivio')
      .select('*, file:archivio_generale(*, area:aree(id, nome))')
      .eq('corso_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('courses').select('id, name').eq('id', id).single(),
  ])

  return (
    <ArchivioCorsoDocenteClient
      fileCorso={fileCorso ?? []}
      corso={corso}
      corsoId={id}
    />
  )
}
```

- [ ] **Step 2: Creare `ArchivioCorsoDocenteClient.tsx` nella stessa cartella**

```tsx
'use client'
import { useState } from 'react'
import { FileText, ToggleLeft, ToggleRight, Upload } from 'lucide-react'
import type { CorsoArchivio } from '@/lib/types'

interface Props {
  fileCorso: CorsoArchivio[]
  corso: { id: string; name: string } | null
  corsoId: string
}

export default function ArchivioCorsoDocenteClient({ fileCorso, corso, corsoId }: Props) {
  const [items, setItems] = useState(fileCorso)
  const [uploading, setUploading] = useState(false)
  const [uploadNome, setUploadNome] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  async function handleToggle(item: CorsoArchivio) {
    const res = await fetch('/api/archivio/toggle', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ corso_archivio_id: item.id, abilitato: !item.abilitato }),
    })
    if (res.ok) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, abilitato: !i.abilitato } : i))
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!uploadFile || !uploadNome) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      fd.append('nome', uploadNome)
      fd.append('corso_id', corsoId)
      const res = await fetch('/api/archivio/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.success) {
        window.location.reload() // ricarica per mostrare nuovo file con metadati completi
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold" style={{ color: '#1B3768' }}>
        Archivio File — {corso?.name}
      </h1>

      {/* Upload */}
      <form onSubmit={handleUpload} className="rounded-2xl p-4 space-y-3"
        style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(27,55,104,0.1)' }}>
        <h2 className="text-sm font-semibold" style={{ color: '#1B3768' }}>Carica file per questo corso</h2>
        <div className="flex gap-3">
          <input type="text" placeholder="Nome documento *" required
            value={uploadNome} onChange={e => setUploadNome(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2 text-sm border"
            style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768' }} />
          <input type="file" required accept=".pdf,.pptx,.doc,.docx,.xlsx"
            onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
            className="text-sm" />
          <button type="submit" disabled={uploading}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2"
            style={{ background: uploading ? 'rgba(8,145,178,0.5)' : '#0891B2' }}>
            <Upload size={14} />
            {uploading ? '...' : 'Carica'}
          </button>
        </div>
      </form>

      {/* Lista file */}
      <div className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(27,55,104,0.1)', background: 'rgba(255,255,255,0.5)' }}>
        {items.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'rgba(27,55,104,0.4)' }}>
            Nessun file in archivio per questo corso
          </p>
        ) : items.map(item => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-t first:border-t-0"
            style={{ borderColor: 'rgba(27,55,104,0.06)' }}>
            <FileText size={16} style={{ color: '#0891B2', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#1B3768' }}>
                {item.file?.nome ?? item.file?.file_name}
              </p>
              <p className="text-xs" style={{ color: 'rgba(27,55,104,0.5)' }}>
                {item.file?.tipo} · {item.file?.area?.nome ?? 'Nessuna area'}
              </p>
            </div>
            <button
              onClick={() => handleToggle(item)}
              title={item.abilitato ? 'Disabilita per studenti' : 'Abilita per studenti'}
              className="flex-shrink-0 transition"
              style={{ color: item.abilitato ? '#0891B2' : 'rgba(27,55,104,0.3)' }}
            >
              {item.abilitato ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
            </button>
            <a href={item.file?.file_url} target="_blank" rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
              style={{ background: 'rgba(8,145,178,0.08)', color: '#0891B2' }}>
              Scarica
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Creare vista archivio corso studente**

```typescript
// app/(dashboard)/studente/corsi/[id]/archivio/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FileText } from 'lucide-react'

export default async function ArchivioCorsoStudentePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: fileAbilitati }, { data: corso }] = await Promise.all([
    supabase
      .from('corso_archivio')
      .select('*, file:archivio_generale(nome, file_url, file_name, tipo, file_size)')
      .eq('corso_id', id)
      .eq('abilitato', true)
      .order('created_at', { ascending: false }),
    supabase.from('courses').select('id, name').eq('id', id).single(),
  ])

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold" style={{ color: '#1B3768' }}>
        Archivio File — {corso?.name}
      </h1>
      {(!fileAbilitati || fileAbilitati.length === 0) ? (
        <p className="text-sm" style={{ color: 'rgba(27,55,104,0.5)' }}>
          Nessun file disponibile per questo corso.
        </p>
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(27,55,104,0.1)', background: 'rgba(255,255,255,0.55)' }}>
          {fileAbilitati.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-t first:border-t-0"
              style={{ borderColor: 'rgba(27,55,104,0.06)' }}>
              <FileText size={16} style={{ color: '#0891B2' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#1B3768' }}>
                  {item.file?.nome}
                </p>
                <p className="text-xs" style={{ color: 'rgba(27,55,104,0.5)' }}>
                  {item.file?.tipo}{item.file?.file_size ? ` · ${Math.round(item.file.file_size / 1024)}KB` : ''}
                </p>
              </div>
              <a href={item.file?.file_url} target="_blank" rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'rgba(8,145,178,0.08)', color: '#0891B2' }}>
                Scarica
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/docente/corsi/ app/\(dashboard\)/studente/corsi/
git commit -m "feat: archivio file per corso (docente toggle + studente download)"
```

---

## Task B9: API Permessi Admin + UI Gestione Permessi

**Files:**
- Create: `app/api/admin/permessi/[userId]/route.ts`
- Create: `app/(dashboard)/super-admin/utenti/[id]/permessi/page.tsx`

- [ ] **Step 1: Creare API permessi**

```typescript
// app/api/admin/permessi/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_PERMISSIONS } from '@/lib/types'

// GET: legge tutti i permessi di un admin
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data } = await supabase
    .from('admin_permissions')
    .select('*')
    .eq('admin_user_id', userId)

  // Costruisci oggetto con tutti i permessi (default false se non esiste)
  const permMap: Record<string, boolean> = {}
  ADMIN_PERMISSIONS.forEach(key => { permMap[key] = false })
  ;(data ?? []).forEach(p => { permMap[p.permission_key] = p.enabled })

  return NextResponse.json({ permissions: permMap })
}

// PATCH: aggiorna un singolo permesso
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  // Solo super_admin può modificare permessi
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Solo super_admin' }, { status: 403 })
  }

  const { permission_key, enabled } = await req.json()
  if (!ADMIN_PERMISSIONS.includes(permission_key) || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('admin_permissions')
    .upsert({
      admin_user_id: userId,
      permission_key,
      enabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'admin_user_id,permission_key' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, record: data })
}
```

- [ ] **Step 2: Creare pagina Gestione Permessi**

```typescript
// app/(dashboard)/super-admin/utenti/[id]/permessi/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PermessiAdminClient from './PermessiAdminClient'

export default async function PermessiAdminPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.auth.getUser()
  const { data: adminProfile } = await supabase
    .from('profiles').select('id, full_name, email, role').eq('id', id).single()

  if (!adminProfile || adminProfile.role !== 'admin') redirect('/super-admin/utenti')

  const { data: perms } = await supabase
    .from('admin_permissions').select('*').eq('admin_user_id', id)

  return <PermessiAdminClient admin={adminProfile} permessi={perms ?? []} />
}
```

- [ ] **Step 3: Creare `PermessiAdminClient.tsx`**

```tsx
// app/(dashboard)/super-admin/utenti/[id]/permessi/PermessiAdminClient.tsx
'use client'
import { useState } from 'react'
import { Shield, Check, X } from 'lucide-react'
import { ADMIN_PERMISSIONS, ADMIN_PERMISSION_LABELS, type AdminPermissionKey } from '@/lib/types'
import type { AdminPermission, Profile } from '@/lib/types'

interface Props {
  admin: Pick<Profile, 'id' | 'full_name' | 'email'>
  permessi: AdminPermission[]
}

export default function PermessiAdminClient({ admin, permessi }: Props) {
  const initMap = () => {
    const m: Record<string, boolean> = {}
    ADMIN_PERMISSIONS.forEach(k => { m[k] = false })
    permessi.forEach(p => { m[p.permission_key] = p.enabled })
    return m
  }
  const [perms, setPerms] = useState<Record<string, boolean>>(initMap)
  const [saving, setSaving] = useState<string | null>(null)

  async function toggle(key: AdminPermissionKey) {
    setSaving(key)
    const newVal = !perms[key]
    const res = await fetch(`/api/admin/permessi/${admin.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permission_key: key, enabled: newVal }),
    })
    if (res.ok) setPerms(p => ({ ...p, [key]: newVal }))
    setSaving(null)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield size={22} style={{ color: '#1B3768' }} />
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1B3768' }}>
            Permessi — {admin.full_name}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(27,55,104,0.5)' }}>{admin.email}</p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(27,55,104,0.1)', background: 'rgba(255,255,255,0.6)' }}>
        {ADMIN_PERMISSIONS.map((key, i) => (
          <div key={key}
            className="flex items-center justify-between px-5 py-4 border-t first:border-t-0"
            style={{ borderColor: 'rgba(27,55,104,0.07)' }}>
            <span className="text-sm font-medium" style={{ color: '#1B3768' }}>
              {ADMIN_PERMISSION_LABELS[key]}
            </span>
            <button
              onClick={() => toggle(key)}
              disabled={saving === key}
              className="w-12 h-6 rounded-full transition-all duration-200 flex items-center px-0.5 relative flex-shrink-0"
              style={{
                background: perms[key] ? '#0891B2' : 'rgba(27,55,104,0.15)',
                opacity: saving === key ? 0.6 : 1,
              }}
            >
              <span
                className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 flex items-center justify-center"
                style={{ transform: perms[key] ? 'translateX(24px)' : 'translateX(0)' }}
              >
                {perms[key]
                  ? <Check size={10} style={{ color: '#0891B2' }} />
                  : <X size={10} style={{ color: 'rgba(27,55,104,0.3)' }} />}
              </span>
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs" style={{ color: 'rgba(27,55,104,0.4)' }}>
        Le modifiche ai permessi sono applicate immediatamente.
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/ app/\(dashboard\)/super-admin/utenti/
git commit -m "feat: gestione permessi admin — API + UI toggle per super_admin"
```

---

## Task B10: Template Corsi — Lista + CRUD base

**Files:**
- Create: `app/(dashboard)/super-admin/corsi/template/page.tsx`
- Create: `app/(dashboard)/super-admin/corsi/template/TemplateListClient.tsx`
- Create: `app/(dashboard)/super-admin/corsi/template/nuovo/page.tsx`

- [ ] **Step 1: Creare pagina lista template**

```typescript
// app/(dashboard)/super-admin/corsi/template/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TemplateListClient from './TemplateListClient'

export default async function TemplateListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: templates }, { data: aree }] = await Promise.all([
    supabase.from('course_templates').select('*').order('nome'),
    supabase.from('aree').select('*').order('nome'),
  ])

  return <TemplateListClient templates={templates ?? []} aree={aree ?? []} />
}
```

- [ ] **Step 2: Creare `TemplateListClient.tsx`**

```tsx
'use client'
import Link from 'next/link'
import { Plus, BookTemplate, Trash2 } from 'lucide-react'
import type { CourseTemplate } from '@/lib/types'

export default function TemplateListClient({
  templates,
}: { templates: CourseTemplate[]; aree: any[] }) {
  async function handleDelete(id: string) {
    if (!confirm('Eliminare questo template?')) return
    await fetch(`/api/course-templates/${id}`, { method: 'DELETE' })
    window.location.reload()
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: '#1B3768' }}>Template Corsi</h1>
        <Link href="/super-admin/corsi/template/nuovo"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: '#0891B2' }}>
          <Plus size={16} /> Nuovo template
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-2xl p-8 text-center"
          style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(27,55,104,0.1)' }}>
          <p className="text-sm" style={{ color: 'rgba(27,55,104,0.5)' }}>
            Nessun template. Crea il primo!
          </p>
        </div>
      ) : templates.map(t => (
        <div key={t.id} className="rounded-2xl p-5 flex items-start gap-4"
          style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(27,55,104,0.1)' }}>
          <BookTemplate size={20} style={{ color: '#0891B2', flexShrink: 0, marginTop: 2 }} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold" style={{ color: '#1B3768' }}>{t.nome}</p>
            {t.tipologia && (
              <p className="text-xs mt-0.5" style={{ color: 'rgba(27,55,104,0.5)' }}>{t.tipologia}</p>
            )}
            <div className="flex gap-3 mt-2 text-xs" style={{ color: 'rgba(27,55,104,0.6)' }}>
              {t.parametri.durata_giorni && <span>{t.parametri.durata_giorni} giorni</span>}
              {t.parametri.materie && <span>{t.parametri.materie.length} materie</span>}
              {t.parametri.tipo_corso && <span className="capitalize">{t.parametri.tipo_corso}</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link href={`/super-admin/corsi/template/${t.id}`}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(8,145,178,0.08)', color: '#0891B2' }}>
              Modifica
            </Link>
            <button onClick={() => handleDelete(t.id)}
              className="p-1.5 rounded-lg transition"
              style={{ color: 'rgba(27,55,104,0.4)' }}>
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Creare form "Nuovo Template"**

```tsx
// app/(dashboard)/super-admin/corsi/template/nuovo/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Minus } from 'lucide-react'

const GIORNI = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']

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
```

- [ ] **Step 4: Creare API route per templates**

```typescript
// app/api/course-templates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('course_templates')
    .insert({ ...body, created_by: user.id })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, template: data })
}
```

```typescript
// app/api/course-templates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { error } = await supabase.from('course_templates').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('course_templates').update(body).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, template: data })
}
```

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/super-admin/corsi/template/ app/api/course-templates/
git commit -m "feat: template corsi — lista, form nuovo, API CRUD"
```

---

## Task B11: Calendari aggregati (super_admin)

**Files:**
- Create: `app/(dashboard)/super-admin/calendari/page.tsx`
- Create: `app/(dashboard)/super-admin/calendari/CalendariClient.tsx`

- [ ] **Step 1: Creare page server**

```typescript
// app/(dashboard)/super-admin/calendari/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalendariClient from './CalendariClient'

export default async function CalendariPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Carica eventi dei prossimi 60 giorni
  const oggi = new Date().toISOString().split('T')[0]
  const fra60 = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0]

  const [{ data: eventi }, { data: corsi }, { data: docenti }] = await Promise.all([
    supabase
      .from('corso_eventi')
      .select(`
        *,
        corso:courses(id, name),
        docenti:corso_eventi_docenti(docente_id, stato, profile:profiles(id, full_name))
      `)
      .gte('data', oggi)
      .lte('data', fra60)
      .order('data', { ascending: true })
      .order('ora_inizio', { ascending: true }),
    supabase.from('courses').select('id, name').eq('status', 'active').order('name'),
    supabase.from('profiles').select('id, full_name').eq('role', 'docente').order('full_name'),
  ])

  return (
    <CalendariClient
      eventi={eventi ?? []}
      corsi={corsi ?? []}
      docenti={docenti ?? []}
    />
  )
}
```

- [ ] **Step 2: Creare `CalendariClient.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import type { CorsoEvento } from '@/lib/types'

interface Props {
  eventi: any[]
  corsi: { id: string; name: string }[]
  docenti: { id: string; full_name: string }[]
}

export default function CalendariClient({ eventi, corsi, docenti }: Props) {
  const [filtroCorso, setFiltroCorso] = useState('')
  const [filtroDocente, setFiltroDocente] = useState('')
  const [settimanaOffset, setSettimanaOffset] = useState(0) // 0 = settimana corrente

  // Calcola la settimana da visualizzare
  const oggi = new Date()
  const lunedi = new Date(oggi)
  lunedi.setDate(oggi.getDate() - oggi.getDay() + 1 + settimanaOffset * 7)

  const giorni = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunedi)
    d.setDate(lunedi.getDate() + i)
    return d
  })

  const eventiFiltered = eventi.filter(e => {
    if (filtroCorso && e.corso_id !== filtroCorso) return false
    if (filtroDocente && !e.docenti?.some((d: any) => d.docente_id === filtroDocente)) return false
    return true
  })

  const eventiPerGiorno = (data: Date) => {
    const dataStr = data.toISOString().split('T')[0]
    return eventiFiltered.filter(e => e.data === dataStr)
  }

  const formatOra = (t: string) => t?.slice(0, 5) ?? ''

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: '#1B3768' }}>Calendari</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setSettimanaOffset(p => p - 1)}
            className="p-2 rounded-lg hover:bg-white/40 transition">
            <ChevronLeft size={18} style={{ color: '#1B3768' }} />
          </button>
          <span className="text-sm font-medium px-3" style={{ color: '#1B3768' }}>
            {lunedi.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} —{' '}
            {giorni[6].toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setSettimanaOffset(p => p + 1)}
            className="p-2 rounded-lg hover:bg-white/40 transition">
            <ChevronRight size={18} style={{ color: '#1B3768' }} />
          </button>
          <button onClick={() => setSettimanaOffset(0)}
            className="text-xs px-3 py-1.5 rounded-lg ml-2"
            style={{ background: 'rgba(27,55,104,0.08)', color: '#1B3768' }}>
            Oggi
          </button>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex gap-3">
        <select value={filtroCorso} onChange={e => setFiltroCorso(e.target.value)}
          className="text-xs rounded-lg px-3 py-2 border"
          style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768', background: 'white' }}>
          <option value="">Tutti i corsi</option>
          {corsi.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filtroDocente} onChange={e => setFiltroDocente(e.target.value)}
          className="text-xs rounded-lg px-3 py-2 border"
          style={{ borderColor: 'rgba(27,55,104,0.2)', color: '#1B3768', background: 'white' }}>
          <option value="">Tutti i docenti</option>
          {docenti.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
        </select>
      </div>

      {/* Griglia settimanale */}
      <div className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(27,55,104,0.1)', background: 'rgba(255,255,255,0.5)' }}>
        {/* Header giorni */}
        <div className="grid grid-cols-7 border-b" style={{ borderColor: 'rgba(27,55,104,0.08)' }}>
          {giorni.map((g, i) => {
            const isOggi = g.toDateString() === oggi.toDateString()
            return (
              <div key={i} className="p-3 text-center border-r last:border-r-0"
                style={{ borderColor: 'rgba(27,55,104,0.06)' }}>
                <p className="text-xs capitalize" style={{ color: 'rgba(27,55,104,0.5)' }}>
                  {g.toLocaleDateString('it-IT', { weekday: 'short' })}
                </p>
                <p className={`text-sm font-semibold mt-0.5 w-7 h-7 rounded-full flex items-center justify-center mx-auto`}
                  style={{
                    color: isOggi ? 'white' : '#1B3768',
                    background: isOggi ? '#0891B2' : 'transparent',
                  }}>
                  {g.getDate()}
                </p>
              </div>
            )
          })}
        </div>

        {/* Celle eventi */}
        <div className="grid grid-cols-7 min-h-48">
          {giorni.map((g, i) => {
            const evs = eventiPerGiorno(g)
            return (
              <div key={i} className="border-r last:border-r-0 p-2 space-y-1"
                style={{ borderColor: 'rgba(27,55,104,0.06)' }}>
                {evs.map((ev: any) => (
                  <div key={ev.id} className="rounded-lg p-2 text-xs"
                    style={{ background: 'rgba(8,145,178,0.1)', borderLeft: '3px solid #0891B2' }}>
                    <p className="font-semibold truncate" style={{ color: '#1B3768' }}>{ev.materia}</p>
                    <p style={{ color: 'rgba(27,55,104,0.6)' }}>
                      {formatOra(ev.ora_inizio)}–{formatOra(ev.ora_fine)}
                    </p>
                    <p className="truncate" style={{ color: 'rgba(27,55,104,0.5)' }}>
                      {ev.corso?.name}
                    </p>
                    {ev.docenti?.map((d: any) => (
                      <p key={d.docente_id} className="truncate" style={{ color: 'rgba(27,55,104,0.5)' }}>
                        {d.profile?.full_name}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/super-admin/calendari/
git commit -m "feat: vista Calendari aggregata per super_admin con filtri corso/docente"
```

---

## Task B12: PDF Programma — Miglioramenti

**Files:**
- Modify: `app/(dashboard)/super-admin/corsi/[id]/programma/export-pdf/route.tsx`
- Modify: `app/(dashboard)/docente/corsi/[id]/programma/export-pdf/route.tsx`
- Modify: `components/programma/PdfPreviewModal.tsx` (esiste già)

- [ ] **Step 1: Leggere le route PDF esistenti**

```bash
cat ~/figc-lms/app/\(dashboard\)/super-admin/corsi/\[id\]/programma/export-pdf/route.tsx | head -60
cat ~/figc-lms/components/programma/PdfPreviewModal.tsx
```

- [ ] **Step 2: Aggiungere copertina con locality e range date**

Nella funzione che genera l'HTML del PDF (in `route.tsx`), modificare la sezione copertina. Aggiungere la query per `courses.location`, `courses.start_date`, `courses.end_date` se non già presenti:

```typescript
// Aggiungere alla query courses esistente
const { data: corso } = await supabase
  .from('courses')
  .select('name, location, start_date, end_date')
  .eq('id', courseId)
  .single()

// Nella copertina HTML del PDF
const copertina = `
  <div style="page-break-after: always; display: flex; flex-direction: column;
    justify-content: center; align-items: center; min-height: 100vh;
    background: linear-gradient(135deg, #1B3768 0%, #0E7490 100%); padding: 60px;">
    <div style="text-align: center; color: white;">
      <div style="margin-bottom: 32px;">
        <div style="font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
          opacity: 0.7; margin-bottom: 12px;">Programma del Corso</div>
        <h1 style="font-size: 36px; font-weight: 700; margin: 0; line-height: 1.2;">
          ${corso?.name ?? 'Programma'}
        </h1>
      </div>
      ${corso?.location ? `
        <div style="font-size: 16px; opacity: 0.85; margin-top: 16px;">
          📍 ${corso.location}
        </div>` : ''}
      ${corso?.start_date ? `
        <div style="font-size: 14px; opacity: 0.7; margin-top: 8px;">
          ${formatDateRange(corso.start_date, corso.end_date)}
        </div>` : ''}
      <div style="margin-top: 48px; font-size: 12px; opacity: 0.5;">
        CoachLab LMS
      </div>
    </div>
  </div>
`
```

Aggiungere la funzione helper:

```typescript
function formatDateRange(start: string, end: string | null | undefined): string {
  const s = new Date(start)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
  if (!end) return s.toLocaleDateString('it-IT', opts)
  const e = new Date(end)
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${s.getDate()} — ${e.toLocaleDateString('it-IT', opts)}`
  }
  return `${s.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} — ${e.toLocaleDateString('it-IT', opts)}`
}
```

- [ ] **Step 3: Migliorare la grafica della giornata**

Nell'HTML generato per ogni giornata del programma, applicare:

```typescript
// Per ogni giornata nel loop
const giornoHtml = `
  <div style="margin-bottom: 32px; break-inside: avoid;">
    <!-- Header giornata con sfondo navy -->
    <div style="background: #1B3768; color: white; padding: 12px 20px;
      border-radius: 10px 10px 0 0; display: flex; justify-content: space-between;">
      <span style="font-size: 15px; font-weight: 700;">${giornata.title}</span>
      <span style="font-size: 12px; opacity: 0.7;">${formatDate(giornata.date)}</span>
    </div>
    <!-- Fasce orarie -->
    <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px; overflow: hidden;">
      ${fasce.map((fascia, fi) => `
        <div style="display: flex; padding: 10px 20px; background: ${fi % 2 === 0 ? '#f8fafc' : 'white'};
          border-bottom: 1px solid #e2e8f0; align-items: flex-start; gap: 16px;">
          <span style="font-size: 11px; color: #64748b; white-space: nowrap; min-width: 90px; padding-top: 2px;">
            ${fascia.start_time?.slice(0,5) ?? ''} – ${fascia.end_time?.slice(0,5) ?? ''}
          </span>
          <div style="flex: 1;">
            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #1B3768;">${fascia.title}</p>
            ${fascia.description ? `<p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">${fascia.description}</p>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  </div>
`
```

- [ ] **Step 4: Aggiungere anteprima popup nel ProgrammaPageClient**

Verificare `components/programma/PdfPreviewModal.tsx` — se già esiste come modal, assicurarsi che abbia un iframe preview:

```tsx
// Se il modal non ha l'iframe, aggiungere:
<iframe
  src={pdfUrl}
  className="w-full h-full"
  style={{ minHeight: '60vh' }}
  title="Anteprima PDF"
/>
```

Nel `ProgrammaPageClient.tsx` (o nei page.tsx di programma), cambiare il bottone "Scarica PDF" per aprire prima il modal di preview:

```tsx
// PRIMA:
<a href={`/[ruolo]/corsi/${id}/programma/export-pdf`} download>Scarica PDF</a>

// DOPO:
<button onClick={() => setPdfPreviewOpen(true)}>
  Anteprima PDF
</button>
{pdfPreviewOpen && (
  <PdfPreviewModal
    pdfUrl={`/[ruolo]/corsi/${id}/programma/export-pdf`}
    onClose={() => setPdfPreviewOpen(false)}
  />
)}
```

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/super-admin/corsi/ app/\(dashboard\)/docente/corsi/ components/programma/
git commit -m "feat: PDF programma — copertina con location+date, grafica giornata migliorata, anteprima popup"
```

---

## Task B13: Merge worktree e test integrato

- [ ] **Step 1: TypeScript check**

```bash
cd ~/figc-lms && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 2: Verificare tutte le nuove route**

```
http://localhost:3001/super-admin/archivio-generale   → pagina archivio
http://localhost:3001/super-admin/corsi/template      → lista template
http://localhost:3001/super-admin/corsi/template/nuovo → form nuovo template
http://localhost:3001/super-admin/calendari           → vista calendari
```

- [ ] **Step 3: Merge in main**

```bash
git checkout main
git merge feature/new-features --no-ff -m "feat: Stream B — archivio, template, calendari, admin, PDF, rename quiz"
```
