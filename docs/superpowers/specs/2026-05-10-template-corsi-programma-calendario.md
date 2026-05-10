# Template Corsi — Programma & Calendario Design Spec

> **For agentic workers:** use `superpowers:subagent-driven-development` to implement this plan task-by-task.

**Goal:** Sistema di template riutilizzabili per corsi UEFA/FIGC che genera automaticamente programma didattico e calendario eventi reali quando si crea un corso, con condivisione PDF per studenti e file interattivo per docenti.

**Architecture:** Template normalizzato su DB → applicazione genera `corso_eventi` (calendario) + `program_blocks` (programma didattico) → vista tabella settimanale stampabile/condivisibile.

**Tech Stack:** Next.js 15 App Router, Supabase PostgreSQL, Tailwind CSS v4, `@react-pdf/renderer` o `jsPDF` per export PDF, lucide-react icons, `nodemailer` / Supabase email per invio mail.

---

## 1. Schema DB

### Modifiche a `course_templates`

```sql
ALTER TABLE course_templates
  ADD COLUMN IF NOT EXISTS struttura_tipo text CHECK (struttura_tipo IN ('giorni', 'moduli')) DEFAULT 'giorni',
  ADD COLUMN IF NOT EXISTS materiali_tags  text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS quiz_tags       text[] DEFAULT '{}';
```

### Nuove tabelle

```sql
-- Moduli (solo per struttura_tipo = 'moduli')
CREATE TABLE template_moduli (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES course_templates(id) ON DELETE CASCADE,
  numero      int  NOT NULL,
  titolo      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Giorni (assoluti per 'giorni', relativi al modulo per 'moduli')
CREATE TABLE template_giorni (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES course_templates(id) ON DELETE CASCADE,
  modulo_id   uuid REFERENCES template_moduli(id) ON DELETE CASCADE,  -- NULL se struttura 'giorni'
  numero      int  NOT NULL,   -- assoluto (1,2,3…) o relativo al modulo (1,2…)
  titolo      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Fasce orarie tipo (sempre collegate a un giorno)
CREATE TABLE template_fasce_orarie (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  giorno_id   uuid NOT NULL REFERENCES template_giorni(id) ON DELETE CASCADE,
  ora_inizio  time NOT NULL,
  ora_fine    time NOT NULL,   -- default: ora_inizio + 2 ore
  materia     text NOT NULL,
  area_id     uuid REFERENCES aree(id) ON DELETE SET NULL,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

### RLS

Tutte e tre le nuove tabelle ereditano la stessa policy di `course_templates`:
- `super_admin` e `admin`: accesso completo
- `docente`: SELECT only
- `studente`: nessun accesso diretto

### Link con sistemi esistenti

Quando si applica un template a un corso, il sistema genera:

1. **`corso_eventi`** — un record per ogni (giorno × fascia), con data reale calcolata:
   ```
   corso_eventi.materia    ← template_fasce_orarie.materia
   corso_eventi.area_id    ← template_fasce_orarie.area_id
   corso_eventi.data       ← start_date + offset giorni (skip domenica, sabato opzionale)
   corso_eventi.ora_inizio ← template_fasce_orarie.ora_inizio
   corso_eventi.ora_fine   ← template_fasce_orarie.ora_fine
   ```

2. **`program_blocks`** — struttura programma didattico speculare, stessa gerarchia moduli/giorni/fasce.

---

## 2. Template Builder UI

### Percorso
`/super-admin/corsi/template/nuovo` e `/super-admin/corsi/template/[id]`

### Layout
Form a sezioni verticali, salvabile in qualsiasi momento.

---

**Blocco 1 — Informazioni base**
| Campo | Tipo | Note |
|---|---|---|
| Nome template | text input | obbligatorio |
| Tipologia | select da `TIPOLOGIE_CORSO` | es. "UEFA A", "Licenza D" |
| Tipo corso | toggle `Centrale` / `Periferico` | mappa su `tipo_corso` |

---

**Blocco 2 — Struttura calendario**

Toggle `Giorni` ↔ `Moduli` in cima al blocco. Cambiare struttura mostra un avviso se ci sono già dati inseriti.

**Vista Giorni:**
```
[+ Aggiungi giorno]

▼ Giorno 1  [titolo opzionale]
   09:00 → 11:00  Tattica           [×]
   11:00 → 13:00  Psicologia        [×]
   [+ Fascia]

▼ Giorno 2  [titolo opzionale]
   ...
```

**Vista Moduli:**
```
▼ Modulo 1 — "Fondamentali"  [+ Giorno]
   ▼ Giorno 1
      09:00 → 11:00  Tattica   [×]
      [+ Fascia]
   ▼ Giorno 2
      ...
[+ Aggiungi modulo]
```

**Regole fasce:**
- Orario default nuova fascia: `fine della fascia precedente → fine + 2 ore`
- Se è la prima fascia del giorno: default `09:00 → 11:00`
- Auto-colon dopo 2 cifre nell'input orario (già presente nel codebase)
- Validazione: fine > inizio

---

**Blocco 3 — Paniere materiali**
Multi-select chip identico a `TipologieSelector` in `ArchivioPaginaClient.tsx`.
Label: "Tipologie materiali suggeriti" — i file dell'archivio generale con quei tag verranno proposti automaticamente quando si applica il template.

**Blocco 4 — Paniere esami**
Identico al Blocco 3 per i quiz della libreria.
Label: "Tipologie esami suggeriti"

---

## 3. Applicazione Template

### 3a. Durante creazione corso (`/super-admin/corsi/nuovo`)

Sezione collassabile "Usa un template" in cima al form:
- Dropdown template filtrato per tipologia (se già selezionata)
- Preview card: nome template, N giorni / N moduli, N fasce/giorno, materiali e quiz suggeriti
- Selezione pre-compila: nome corso, tipologia, tipo_corso

Al salvataggio del corso, se è stato scelto un template, appare un **modal "Genera programma"**:

```
┌─────────────────────────────────────┐
│  Genera programma dal template      │
│                                     │
│  Data inizio corso  [__/__/____]    │
│  ☑ Salta domenica  ☐ Salta sabato   │
│                                     │
│  Anteprima:                         │
│  Giorno 1 → Lun 12 giu              │
│  Giorno 2 → Mar 13 giu              │
│  Giorno 3 → Sab 15 giu              │
│  ...                                │
│                                     │
│  [Salta]      [Genera →]            │
└─────────────────────────────────────┘
```

Conferma → API `/api/template/applica` che:
1. Calcola le date reali per ogni giorno (offset da start_date, skip domenica always, skip sabato se selezionato)
2. Inserisce tutti i `corso_eventi`
3. Crea un nuovo `program` e i relativi `program_blocks`
4. Propone nel tab Materiali i file dell'archivio taggati con `materiali_tags`
5. Propone nel tab Esami i quiz taggati con `quiz_tags`

### 3b. Su corso esistente (tab Panoramica)

Pulsante "Applica template" → stesso modal in 3 step:
1. Scegli template (lista con preview)
2. Data inizio + opzioni (stessa UI del modal sopra)
3. Conferma — se esistono già `corso_eventi` o `program_blocks`: avviso "Il programma e il calendario esistenti verranno sostituiti. Continuare?"

---

## 4. Vista Calendario Tabella

### Percorso
Tab "Calendario" nella pagina dettaglio corso (già presente come tab nel nav).

### Layout — Tabella settimanale orizzontale

```
         Lun      Mar      Mer      Gio      Ven      Sab
Sett 1   [fascia] [fascia] [fascia] [fascia] [fascia] [fascia]
         [fascia] [fascia]
Sett 2   [fascia] [fascia] ...
...
Sett 4   ...
─────────────────────────────────────────────────────
         [← Prev 4 sett]              [Prossime 4 sett →]
```

- 6 colonne (Lun–Sab), domenica sempre nascosta
- 4–5 settimane per pagina, navigazione prev/next
- Ogni cella mostra le fasce del giorno: orario + materia
- Cella vuota (nessun evento) → grigio chiaro
- Header di settimana mostra il range date (es. "12–17 giu")

### Condivisione e visibilità

| Ruolo | Accesso |
|---|---|
| super_admin / admin | Visualizzazione + modifica + condivisione |
| docente | Visualizzazione + modifica + download file |
| studente | Solo PDF (sola lettura) |

**Opzioni condivisione** (pulsante in alto a destra della vista):
- **Scarica PDF** — genera PDF del calendario tabellare (formato A4 landscape)
- **Invia via mail** — input email, invia PDF allegato
- **Visibilità programma** — toggle: Privato / Docenti del corso / Studenti (riusa `ProgramVisibility` già esistente)

### Export PDF

Layout A4 orizzontale (landscape):
- Header: logo CoachLab + nome corso + date range
- Tabella settimanale (stessa struttura UI, ottimizzata per stampa)
- Footer: data generazione
- Massimo 4 settimane per pagina, nuova pagina automatica se il corso è più lungo

---

## 5. Sharing

### Docenti
- Vedono il programma completo nella loro area (`/docente/corsi/[id]/programma`)
- Possono modificare fasce, aggiungere note
- Possono scaricare il **file sorgente** (struttura dati) per importazioni future
- Ricevono notifica in-app quando il programma viene aggiornato

### Studenti
- Vedono solo il PDF del calendario (non la struttura del programma)
- Accesso dalla loro area corso → tab "Programma"
- Nessuna interazione, solo visualizzazione

---

## 6. API Routes

| Route | Metodo | Descrizione |
|---|---|---|
| `/api/template/[id]` | GET | Fetch template completo con giorni/moduli/fasce |
| `/api/template/[id]` | PUT | Salva modifiche template |
| `/api/template/[id]/giorni` | POST/DELETE | Aggiungi/rimuovi giorno |
| `/api/template/[id]/moduli` | POST/DELETE | Aggiungi/rimuovi modulo |
| `/api/template/[id]/fasce` | POST/PUT/DELETE | CRUD fasce orarie |
| `/api/template/applica` | POST | Applica template a corso (genera eventi + programma) |
| `/api/corsi/[id]/calendario` | GET | Fetch eventi corso per vista tabella |
| `/api/corsi/[id]/calendario/pdf` | GET | Genera e restituisce PDF calendario |
| `/api/corsi/[id]/calendario/invia` | POST | Invia PDF via mail |

---

## 7. File da creare / modificare

**Nuovi:**
- `supabase/migrations/20260511XXXXXX_template_struttura.sql`
- `app/(dashboard)/super-admin/corsi/template/[id]/page.tsx` — edit template
- `app/(dashboard)/super-admin/corsi/template/[id]/TemplateEditorClient.tsx`
- `components/template/GiorniEditor.tsx` — editor giorni con fasce
- `components/template/ModuliEditor.tsx` — editor moduli → giorni → fasce
- `components/template/FasciaRow.tsx` — singola fascia oraria inline
- `app/(dashboard)/super-admin/corsi/[id]/calendario/page.tsx` — vista tabella
- `app/(dashboard)/super-admin/corsi/[id]/calendario/CalendarioTabella.tsx`
- `app/(dashboard)/docente/corsi/[id]/calendario/page.tsx` — stessa vista per docente
- `app/(dashboard)/studente/corsi/[id]/calendario/page.tsx` — solo PDF per studente
- `app/api/template/[id]/route.ts`
- `app/api/template/[id]/giorni/route.ts`
- `app/api/template/[id]/moduli/route.ts`
- `app/api/template/[id]/fasce/route.ts`
- `app/api/template/applica/route.ts`
- `app/api/corsi/[id]/calendario/pdf/route.ts`
- `app/api/corsi/[id]/calendario/invia/route.ts`

**Modificati:**
- `supabase/migrations/` — estende `course_templates`
- `app/(dashboard)/super-admin/corsi/template/nuovo/page.tsx` — aggiunge struttura giorni/moduli
- `app/(dashboard)/super-admin/corsi/nuovo/page.tsx` (o client) — aggiunge "Usa template"
- `app/(dashboard)/super-admin/corsi/[id]/page.tsx` — aggiunge pulsante "Applica template"
- `app/(dashboard)/docente/corsi/[id]/page.tsx` — stessa cosa
- `lib/types.ts` — aggiunge `CourseTemplateCompleto`, `TemplateGiorno`, `TemplateModulo`, `TemplateFascia`
- `lib/tipologie-corso.ts` — già esistente, nessuna modifica

---

## 8. Decisioni tecniche chiave

- **Calcolo date:** funzione pura `calcolaDateCorso(startDate, nGiorni, options: {skipSabato, skipDomenica})` → restituisce array di Date. Skip domenica sempre attivo di default; skip sabato default OFF.
- **Blocchi default 2 ore:** ogni nuova fascia si pre-compila con `ora_fine = ora_inizio + 120 min`
- **PDF:** usare la libreria già in uso nel progetto per export PDF (route `export-pdf` esistente per programma) — stesso approccio per il calendario tabella
- **Visibilità programma:** riusa l'enum `ProgramVisibility` già in `lib/types.ts` (`private | instructors | students`)
- **Studenti:** vedono solo PDF, non la struttura `program_blocks` né `corso_eventi` in formato editabile

---

## 9. Scope escluso (YAGNI)

- Import template da file esterno
- Template condivisi tra organizzazioni diverse
- Versionamento template (storico modifiche)
- Drag & drop reordering giorni/moduli (rinviato)
- Notifiche email automatiche agli studenti quando il programma viene pubblicato
