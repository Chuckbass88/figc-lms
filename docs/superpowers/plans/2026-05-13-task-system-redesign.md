# Task System Redesign — Piano di Implementazione
**Data:** 2026-05-13 | **Priorità:** Alta

---

## Obiettivo

Rivedere completamente il sistema task per supportare:
- Feedback iterativo docente↔studente (thread privato per coppia)
- Versioning submission con cleanup automatico file (transient relay)
- Voto numerico con scala definita nel template corso
- Target differenziati (corso/microgruppo/singolo) con logiche diverse
- Vista globale "Le mie task" per il docente
- File grandi (200MB–1GB+): PDF, PPTX, XLSX

---

## Regole di business (definite in QA — 13 maggio 2026)

| Regola | Valore |
|--------|--------|
| Formati accettati | PDF, PPTX, XLSX |
| File richiesto | Default ON, docente può disabilitare |
| Note studente | Sempre facoltative |
| Voto | Base 0–10 con decimali (es. 7.5), scala corso da template |
| Voto condiviso | Default NON condiviso, spunta opzionale docente |
| Notifica valutazione | Generica; include voto solo se condiviso |
| Versioning | Ogni upload sostituisce il precedente + elimina file vecchio da storage |
| Deadline | Auto-chiude upload; docente può riaprire per singolo studente |
| Feedback | Solo per singolo e microgruppo — NON per task corso intero |
| Microgruppo | Un file per gruppo, referente designato dal docente per ogni task |
| Feedback microgruppo | Thread visibile a tutti i membri del gruppo; voto condiviso |
| Thread post-voto | Chiuso → comunicazioni ulteriori in sezione Messaggi |
| Storage cleanup | Auto-delete dopo valutazione completa (o TTL 30gg) |
| Download locale docente | Signed URL 2h durante finestra valutazione + banner avviso |
| Vista studente | Solo task del proprio corso |
| Vista docente | Per-corso + sezione globale "Le mie task" in sidebar |
| Task privacy | Ogni studente vede solo le proprie — totale isolamento |

---

## Step 1 — Database Migration

**File:** `supabase/migrations/029_task_system_redesign.sql`

### 1A — Modifica `course_tasks`

```sql
ALTER TABLE course_tasks
  ADD COLUMN IF NOT EXISTS require_file      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS accepted_formats  text[]  NOT NULL DEFAULT ARRAY['pdf','pptx','xlsx'],
  ADD COLUMN IF NOT EXISTS grade_visible     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referente_id      uuid REFERENCES profiles(id) ON DELETE SET NULL;
-- referente_id: solo per task microgruppo — lo studente designato per l'upload
```

### 1B — Modifica `task_submissions`

```sql
ALTER TABLE task_submissions
  ADD COLUMN IF NOT EXISTS status            text    NOT NULL DEFAULT 'consegnato'
    CHECK (status IN ('consegnato','in_revisione','valutato')),
  ADD COLUMN IF NOT EXISTS version_number    integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS grade_decimal     numeric(4,2),         -- sostituisce grade (text)
  ADD COLUMN IF NOT EXISTS file_deleted_at   timestamptz,          -- quando il file è stato eliminato
  ADD COLUMN IF NOT EXISTS deadline_extended timestamptz;          -- se docente riapre per questo studente
-- grade (text) lasciato per retrocompatibilità, ma nuove valutazioni usano grade_decimal
```

### 1C — Nuova tabella `task_feedback`

```sql
CREATE TABLE IF NOT EXISTS task_feedback (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES task_submissions(id) ON DELETE CASCADE,
  sender_id     uuid NOT NULL REFERENCES profiles(id),
  sender_role   text NOT NULL CHECK (sender_role IN ('docente','studente','super_admin','admin')),
  content       text NOT NULL,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE task_feedback ENABLE ROW LEVEL SECURITY;

-- Docente vede tutti i feedback delle sue task
-- Studente vede solo i feedback della propria submission (o del suo gruppo)
-- Admin/super_admin vedono tutto
CREATE POLICY "feedback_docente" ON task_feedback
  USING (
    EXISTS (
      SELECT 1 FROM task_submissions ts
      JOIN course_tasks ct ON ct.id = ts.task_id
      JOIN courses c ON c.id = ct.course_id
      JOIN course_instructors ci ON ci.course_id = c.id
      WHERE ts.id = task_feedback.submission_id
        AND ci.instructor_id = auth.uid()
    )
  );

CREATE POLICY "feedback_student_own" ON task_feedback
  USING (
    sender_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM task_submissions ts
      WHERE ts.id = task_feedback.submission_id
        AND ts.student_id = auth.uid()
    )
    OR
    -- Microgruppo: tutti i membri del gruppo vedono il thread
    EXISTS (
      SELECT 1 FROM task_submissions ts
      JOIN course_tasks ct ON ct.id = ts.task_id
      JOIN course_group_members cgm ON cgm.group_id = ct.group_id
      WHERE ts.id = task_feedback.submission_id
        AND cgm.student_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_task_feedback_submission ON task_feedback(submission_id);
```

### 1D — Scala voto su `courses` (ereditata dal template)

```sql
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS grading_scale integer NOT NULL DEFAULT 10
    CHECK (grading_scale IN (10, 30, 110));
-- 10 = scala 0–10, 30 = scala 0–30 (×3), 110 = scala 0–110 (×11)
-- voto_finale_display = grade_decimal * (grading_scale / 10.0)
```

---

## Step 2 — Storage

**Bucket:** `task-submissions` (già esistente — renderlo privato se pubblico)

**Path:** `{courseId}/{taskId}/{studentId}/submission.{ext}`

Path fisso per studentId+taskId → ogni nuovo upload **sovrascrive** il file precedente automaticamente (Supabase upsert). Nessuna proliferazione di versioni in storage.

### Upload grandi file (>50MB)

Usare **Supabase Resumable Upload** (protocollo TUS):
```ts
const { data, error } = await supabase.storage
  .from('task-submissions')
  .upload(path, file, {
    upsert: true,           // sovrascrive il precedente
    duplex: 'half',         // necessario per stream grandi
  })
```

Rimuovere il limite 50MB hardcoded in `/api/task/submit`.
Limite reale: dipende dal piano Supabase (Pro: 50GB per file singolo).

### Signed URL per download docente

```ts
const { data } = await supabase.storage
  .from('task-submissions')
  .createSignedUrl(path, 7200) // 2 ore
```

### Cleanup automatico

Quando `task_submissions.status` passa a `'valutato'`:
1. Elimina file da storage: `supabase.storage.from('task-submissions').remove([path])`
2. Imposta `file_deleted_at = now()`
3. Il bucket rimane — solo il file specifico viene rimosso

TTL fallback: cron job giornaliero che elimina file di task valutate da più di 30 giorni.

---

## Step 3 — API Routes

### 3A — Modifica `/api/task/create` (POST)

Aggiungere ai campi accettati:
- `require_file: boolean` (default true)
- `grade_visible: boolean` (default false)
- `referente_id: string | null` (solo per task microgruppo)

### 3B — Modifica `/api/task/submit` (POST)

```
1. Verifica che la task accetti file (require_file=true) se file presente
2. Verifica formato: solo pdf/pptx/xlsx
3. Verifica deadline: se scaduta, controlla deadline_extended per questo studente
4. Verifica autorizzazione upload:
   - task singolo: solo lo studente target
   - task microgruppo: solo il referente_id
   - task corso: tutti gli studenti iscritti
5. Upload con upsert=true (sovrascrive file precedente)
6. Aggiorna task_submissions: file_url, file_name, file_size, version_number+1, status='consegnato'
7. Notifica docente: "Nuova consegna da [studente]"
```

### 3C — Modifica `/api/task/valuta` (POST)

```
1. Salva grade_decimal (numeric) invece di grade (text)
2. Imposta status='valutato'
3. Elimina file da storage → imposta file_deleted_at
4. Se grade_visible=true:
   - Notifica: "La tua task è stata valutata — Voto: {grade_decimal}/10"
   - Email con voto
5. Se grade_visible=false:
   - Notifica: "La tua task è stata valutata"
   - Email generica senza voto
6. Chiude il thread feedback (status='valutato' usato come lock in UI)
```

### 3D — Nuova `GET /api/task/[taskId]/submissions`

Lista tutte le submission di una task con status, file info, grade, feedback count.
Solo docente/admin/super_admin.

### 3E — Nuove `/api/task/feedback`

```
GET  /api/task/feedback?submissionId=X  → thread completo
POST /api/task/feedback                 → { submissionId, content }
```

Visibilità:
- Studente: solo submission propria (o del suo gruppo per microgruppo)
- Docente: tutte le submission delle sue task
- Admin/super_admin: tutto

### 3F — Nuova `PATCH /api/task/[taskId]/reopen`

```
Body: { studentId: string, newDeadline: string }
Imposta task_submissions.deadline_extended = newDeadline per quel solo studente
Solo docente istruttore del corso o admin
```

### 3G — Nuova `GET /api/task/docente`

Vista globale per docente: tutte le task di tutti i suoi corsi.
```sql
SELECT ct.*, c.name as course_name,
  COUNT(ts.id) FILTER (WHERE ts.status='consegnato') as da_valutare,
  COUNT(ts.id) FILTER (WHERE ts.status='valutato')   as valutati,
  COUNT(ts.id)                                        as totale
FROM course_tasks ct
JOIN courses c ON c.id = ct.course_id
JOIN course_instructors ci ON ci.course_id = c.id
LEFT JOIN task_submissions ts ON ts.task_id = ct.id
WHERE ci.instructor_id = $userId
GROUP BY ct.id, c.name
ORDER BY ct.due_date ASC
```

### 3H — Nuova `GET /api/task/[taskId]/signed-url/[studentId]`

Genera signed URL (2h) per il download del file di una submission.
Solo docente/admin — non accessibile dallo studente direttamente.

---

## Step 4 — UI Docente

### 4A — `NuovoTaskForm.tsx` (modifica)

Aggiungere al form di creazione:
- Toggle **"Richiedi file allegato"** — default ON
  - Se ON: mostra selector formati (PDF ✓, PPTX ✓, XLSX ✓) — tutti selezionati di default
- Toggle **"Condividi voto con lo studente"** — default OFF, con tooltip esplicativo
- Per task microgruppo: dropdown **"Referente consegna"** — seleziona uno studente del gruppo

### 4B — Task detail page docente (riscrittura)

**Layout a due pannelli:**
- **Sinistra:** lista studenti/gruppi con stato badge
  - "Da consegnare" (grigio) / "Consegnato" (blu) / "In revisione" (ambra) / "Valutato" (verde)
  - Click su studente → pannello destro
- **Destra:** thread per studente selezionato
  - Header: nome studente, data consegna, numero versione
  - Se file presente: pulsante "Scarica in locale" (signed URL) + banner avviso cleanup
  - Thread cronologico: upload → feedback docente → risposta studente → upload v2 → …
  - Form feedback (solo se task non valutata e target ≠ corso intero)
  - Form valutazione finale: campo `grade_decimal` (0–10, decimali), toggle condividi voto, pulsante "Valuta e chiudi"

### 4C — "Le mie task" — nuova pagina globale

**Route:** `/docente/task`  
**Sidebar:** voce "Le mie task" con badge contatore "da valutare"

Layout:
- Filtri: Corso | Stato (tutti / da valutare / valutati / in scadenza) | Data
- Lista task con: nome task, nome corso, badge stato aggregato, deadline, n° consegnati/totale
- Click → va alla task detail nel contesto del corso

### 4D — Banner cleanup nel dettaglio task

Se `file_deleted_at IS NULL` e `status='valutato'` non ancora:
```
⚠️ I file verranno eliminati dopo la valutazione. Scarica ora se vuoi conservarli.
```
Se `file_deleted_at IS NOT NULL`:
```
🗑 File eliminati il {data}. Restano: voto e feedback.
```

---

## Step 5 — UI Studente

### 5A — Task detail page studente (riscrittura)

**Per task corso intero (no feedback):**
- Descrizione task + allegato docente
- Form upload semplice (se require_file=true) o solo note
- Stato: "Da consegnare" / "Consegnato" / "Valutato"
- Se valutato e grade_visible: mostra voto convertito alla scala corso

**Per task singolo/microgruppo (con feedback):**
- Descrizione task + allegato docente
- Thread cronologico (read-only per studente del microgruppo non referente)
- Form upload + note (solo per lo studente target / referente microgruppo)
- Ogni nuovo upload mostra "Versione X caricata — il file precedente è stato sostituito"
- Se valutato: thread bloccato, mostra voto (se condiviso) + link "Continua in Messaggi"

### 5B — Stato upload microgruppo

Per studenti del gruppo non referenti: vedono il thread in sola lettura.
Header: "Consegna gestita da [Nome Referente]"

---

## Step 6 — Sidebar aggiornamenti

**Docente:** aggiungere voce "Le mie task" (`/docente/task`) con badge numerico
```ts
{ type: 'leaf', label: 'Le mie task', href: '/docente/task', icon: <ClipboardList size={17} />, badge: 'tasks' }
```

Badge `tasks`: contatore submission con `status='consegnato'` nei corsi del docente.

---

## Step 7 — Notifiche e Email

| Evento | Destinatario | Notifica in-app | Email |
|--------|-------------|----------------|-------|
| Studente consegna | Docente | "Nuova consegna: {task}" | No |
| Docente lascia feedback | Studente | "Nuovo feedback sulla task {task}" | No |
| Docente valuta (grade_visible=false) | Studente | "La tua task è stata valutata" | Sì, generica |
| Docente valuta (grade_visible=true) | Studente | "Valutazione: {voto}/10" | Sì, con voto |
| Docente riapre deadline | Studente | "La deadline è stata estesa fino al {data}" | No |
| Cleanup file imminente (24h prima) | Docente | "I file della task {task} verranno eliminati domani" | No |

---

## Step 8 — Ordine di esecuzione

- [ ] **Step 1** — Migration SQL 029 su Supabase
- [ ] **Step 2** — Storage: rendere bucket privato, rimuovere limite 50MB, test upload grande
- [ ] **Step 3A-3C** — Modifica API create/submit/valuta
- [ ] **Step 3D-3H** — Nuove API (submissions list, feedback, reopen, docente view, signed URL)
- [ ] **Step 4A** — NuovoTaskForm aggiornato
- [ ] **Step 4B** — Task detail docente (layout due pannelli + thread)
- [ ] **Step 4C** — Pagina globale "Le mie task" docente
- [ ] **Step 4D** — Banner cleanup
- [ ] **Step 5A-5B** — UI studente task detail
- [ ] **Step 6** — Sidebar: voce "Le mie task" + badge
- [ ] **Step 7** — Notifiche e email
- [ ] TypeScript check + migration Supabase + commit + push
