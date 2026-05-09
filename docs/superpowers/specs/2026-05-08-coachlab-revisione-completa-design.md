# CoachLab LMS — Revisione Completa: Design Spec
**Data:** 2026-05-08
**Deadline presentazione:** 2026-05-15 (7 giorni)
**Ambiente:** Solo locale (`localhost:3001`) — deploy su Vercel solo a prodotto finito

---

## Contesto

CoachLab LMS è una piattaforma di formazione per allenatori di calcio, già in produzione su `coachlab.it`. Stack: Next.js 16 App Router + Supabase + Vercel. Ruoli attuali: `super_admin`, `docente`, `studente`. Il prodotto deve essere pronto per una presentazione al datore di lavoro entro 7 giorni con demo live + pitch deck.

## Obiettivo

Revisione completa su tre fronti in parallelo:
1. **Design/UX** — navigazione, dashboard, sezioni corso
2. **Feature e DB** — nuove funzionalità pendenti + audit database
3. **Documenti business** — pitch deck e business plan costi

---

## Architettura Generale del Progetto

### Repository e branch

```
main (integrazione — non si tocca direttamente)
├── feature/ux-redesign     ← Stream A (Design/UX)
└── feature/new-features    ← Stream B (Feature + DB)
```
Stream C (business docs) produce solo file in `docs/` — nessun branch separato.
Merge in `main` al Giorno 6. Deploy su Vercel solo dopo merge e test locale completo.

### Regola di non-conflitto

- Stream A: tocca layout, sidebar, componenti navigazione, dashboard
- Stream B: tocca route API, nuove pagine, migrations Supabase
- Unico file condiviso: `app/(dashboard)/layout.tsx` — assegnato a Stream A, Stream B non lo modifica

### Deliverable e timeline

| Deliverable | Stream | Pronto entro |
|---|---|---|
| DB audit + migrations | B | Giorno 2 |
| Rename Quiz → Esami e Prove Intermedie | B | Giorno 1 |
| Nuovo ruolo Admin + permessi | B | Giorno 2 |
| Aree disciplinari (DB + UI) | B | Giorno 2 |
| Navigazione Notion-style (tutti i ruoli) | A | Giorno 3 |
| Archivio Generale per Aree | B | Giorno 4 |
| Dashboard upgrade (tutti i ruoli) | A | Giorno 5 |
| Feature: Template Corsi + Calendario | B | Giorno 5 |
| Feature: PDF Programma (grafica + popup) | B | Giorno 6 |
| Business plan costi operativi | C | Giorno 2 |
| Pitch deck (10-12 slide) | C | Giorno 5 |
| Script demo live | C | Giorno 5 |
| Merge + test locale integrato | — | Giorno 6 |
| Buffer + rifinitura finale | — | Giorno 7 |

---

## Stream A — Design/UX

### Nuovo ruolo: `admin`

Quarto ruolo aggiunto al sistema, tra `super_admin` e `docente`. Stesse funzioni del super_admin ma con limitazioni funzionali configurabili per singolo utente.

> ⚠️ **Cross-dipendenza Stream A/B:** Le migration DB per il ruolo `admin` (`ALTER TABLE profiles`, `CREATE TABLE admin_permissions`) sono eseguite da Stream B (Giorno 2). Stream A può iniziare la UI della sidebar admin in parallelo usando il ruolo come costante stringa, ma le RLS Supabase dipendono dalle migration di Stream B. Il merge finale risolve l'integrazione.

Le migration sono documentate in dettaglio nella sezione **Stream B — B2 e B3**.

**Permessi disponibili:**

| permission_key | Area | Default |
|---|---|---|
| `template_corsi` | Gestione template corsi (CRUD globale) | ❌ |
| `archivio_globale_write` | Carica file nel DB globale | ❌ |
| `archivio_globale_read` | Consulta archivio globale | ✅ |
| `gestione_admin` | Crea/elimina altri Admin | ❌ |
| `import_utenti` | Importazione massiva utenti | ❌ |
| `export_globale` | Export CSV tutti i corsi/utenti | ❌ |
| `configurazioni_sistema` | Impostazioni globali/integrazioni | ❌ |
| `report_globale` | Report presenze tutti i corsi | ✅ |

**UI Gestione Permessi (solo super_admin):** sezione in `/super-admin/utenti/admin/[id]/permessi` con toggle per ogni permission_key. Le voci disabilitate nell'UI dell'admin appaiono grayed out con tooltip "Permesso non attivo".

---

### Navigazione Sidebar — Notion-style

**Principi:**
- Sezioni collassabili con `useState` + persistenza `localStorage`
- Separatori `rgba(27,55,104,0.1)` tra gruppi logici
- Voce attiva: navy `#1B3768` + testo bianco (invariato)
- Icone: Lucide React (già installato)
- "Quiz" → rinominato **"Esami e Prove Intermedie"** ovunque nell'UI (non nei nomi DB/route/componenti)

**Sidebar SUPER ADMIN:**
```
📊 Dashboard
─────────────────────────────
🎓 Corsi
   ├── Tutti i corsi
   ├── Crea nuovo corso
   └── Template corsi
👥 Utenti
   ├── Corsisti               [→ contatta msg/email]
   ├── Docenti                [→ contatta msg/email]
   ├── Admin
   └── Importa utenti
📁 Archivio Generale
   └── Documenti e Slides
📅 Calendari
🔍 Cerca
─────────────────────────────
💬 Messaggi                   [badge]
🔔 Notifiche                  [badge]
📝 Note
─────────────────────────────
⚙️ Profilo / Impostazioni
```

**Sidebar ADMIN** (identica a super_admin, voci con permesso=false appaiono grayed out):
```
[stessa struttura super_admin]
```

**Sidebar DOCENTE:**
```
📊 Dashboard
─────────────────────────────
🎓 I miei corsi
   └── [Nome Corso]           ← espanso se sei nel corso
       ├── Presenze
       ├── Task
       ├── Valutazioni
       ├── Programma
       ├── Materiali
       ├── Archivio File
       ├── Annunci
       ├── Corsisti           [→ contatta msg/email]
       └── Esami e Prove Int.  ← in fondo
📚 Libreria
   ├── Archivio Doc & Slides  ← Archivio per aree di competenza
   └── Banca Domande
📅 Calendario
─────────────────────────────
💬 Messaggi                   [badge]
🔔 Notifiche                  [badge]
📝 Note
─────────────────────────────
⚙️ Profilo
```

**Sidebar STUDENTE:**
```
📊 Dashboard
─────────────────────────────
🎓 I miei corsi
   └── [Nome Corso]
       ├── Programma
       ├── Presenze
       ├── Materiali
       ├── Archivio File
       ├── Annunci
       ├── Task
       └── Esami e Prove Int.
📅 Calendario
─────────────────────────────
💬 Messaggi                   [badge]
🔔 Notifiche                  [badge]
─────────────────────────────
⚙️ Profilo
```

### Contatto rapido da lista utenti

In ogni lista corsisti (docente) e lista docenti/corsisti (super_admin/admin): ogni riga ha:
- ✉️ **Messaggio interno** → apre chat esistente o crea nuova conversazione diretta
- 📧 **Email** → `mailto:` con email pre-compilata

---

### Dashboard — Tutti i ruoli

**Super Admin — Lista corsi attivi (no card, lista compatta):**
```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ 🎓 68 corsi att. │  │ ⚠️ 3 scadenze    │  │ 📋 8 task        │
│ [link lista]     │  │ entro 7 giorni   │  │ da valutare      │
└──────────────────┘  └──────────────────┘  └──────────────────┘

Corsi attivi (68)               [Filtro: Regione ▼] [Tipo ▼]
┌────┬──────────────────────┬──────────┬──────────┬─────┬───────────┐
│ #  │ Nome corso           │ Regione  │ Tipo     │ Doc │ CU        │
├────┼──────────────────────┼──────────┼──────────┼─────┼───────────┤
│ 1  │ UEFA A — Milano      │ Nord     │ Centrale │Nista│ [2026/041]│ ← link CU
│ 2  │ Preparatori — Roma   │ Centro   │ Periferic│Rossi│ [2026/087]│
└────┴──────────────────────┴──────────┴──────────┴─────┴───────────┘
[click riga → dettaglio corso]
```

- CU = Comunicato Ufficiale: testo numero + link al documento ufficiale (apre nuova tab)
- Filtri per Regione e Tipologia (Centrale/Periferico)
- Paginazione o scroll virtuale per 60-70 corsi
- Widget rimossi: ~~Quiz recenti~~ — eliminato

**Docente:** testo esplicativo sui widget esistenti, nessuno stravolgimento strutturale.
**Studente:** widget "Prossima sessione" (prossima lezione calendario) + % presenze aggiornata.

---

## Stream B — Feature e Database

### B1. DB Audit (Giorno 1)

Un agente analizza lo schema Supabase completo e produce `docs/db-audit-2026-05-08.md` con:
- FK senza indici (es. `course_id`, `user_id`)
- Colonne nullable che non dovrebbero esserlo
- Tabelle/colonne inutilizzate
- RLS policy mancanti per il ruolo `admin`
- Lista migration SQL da eseguire in sequenza

### B2. Nuove colonne `courses`

```sql
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS cu_number text,       -- es. "2026/041234"
  ADD COLUMN IF NOT EXISTS cu_url text,          -- link documento CU ufficiale
  ADD COLUMN IF NOT EXISTS regione text,         -- Nord, Centro, Sud, Isole
  ADD COLUMN IF NOT EXISTS tipo_corso text,      -- 'centrale' | 'periferico'
  ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES aree(id);
```

### B3. Aree Disciplinari

```sql
CREATE TABLE aree (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,              -- es. "Psicologia", "Regolamento di Gioco"
  descrizione text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE docente_aree (
  docente_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  area_id uuid REFERENCES aree(id) ON DELETE CASCADE,
  PRIMARY KEY (docente_id, area_id)
);
```

Ogni docente ha una o più aree di competenza. Quando si assegna un docente a una materia di un corso, il sistema suggerisce automaticamente i docenti con quell'area.

### B4. Archivio Generale Documenti e Slides

**Logica bidirezionale:**
- File caricato in un corso → catalogato automaticamente in `archivio_generale` con `corso_origine_id`
- Dall'archivio globale → "Applica al corso X" → appare nei materiali del corso
- Accesso filtrato per area (`area_id`)

```sql
CREATE TABLE archivio_generale (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  tipo text,                        -- 'PDF' | 'PPTX' | 'DOC' | 'XLSX'
  uploaded_by uuid REFERENCES profiles(id),
  corso_origine_id uuid REFERENCES courses(id),
  area_id uuid REFERENCES aree(id),
  tags text[],
  created_at timestamptz DEFAULT now()
);

CREATE TABLE corso_archivio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archivio_id uuid REFERENCES archivio_generale(id) ON DELETE CASCADE,
  corso_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  abilitato boolean DEFAULT true,
  added_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(archivio_id, corso_id)
);
```

**Accesso per ruolo:**

| Azione | super_admin | admin | docente | studente |
|---|:---:|:---:|:---:|:---:|
| Carica in archivio globale | ✅ | con `archivio_globale_write` | ❌ | ❌ |
| Consulta archivio globale | ✅ | con `archivio_globale_read` | ✅ solo sue aree | ❌ |
| Applica doc a corso | ✅ | ✅ | ✅ | ❌ |
| Scarica file abilitati | ✅ | ✅ | ✅ | ✅ |

**Route nuove:**
- `/super-admin/archivio-generale` — gestione DB globale per area
- `/docente/corsi/[id]/archivio` — vista corso + link a archivio per sue aree
- `/studente/corsi/[id]/archivio` — read-only studente
- `/api/archivio/upload` — upload + catalogazione automatica
- `/api/archivio/applica` — associa file archivio a corso
- `/api/archivio/toggle` — abilita/disabilita file per corso

### B5. Template Corsi + Calendario + Materie

**Tabelle:**
```sql
CREATE TABLE course_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipologia text,
  parametri jsonb NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE corso_eventi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corso_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  materia text NOT NULL,
  area_id uuid REFERENCES aree(id),
  data date NOT NULL,
  ora_inizio time NOT NULL,
  ora_fine time NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE corso_eventi_docenti (
  evento_id uuid REFERENCES corso_eventi(id) ON DELETE CASCADE,
  docente_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  stato text DEFAULT 'invitato',    -- 'invitato' | 'confermato' | 'declinato'
  PRIMARY KEY (evento_id, docente_id)
);
```

**Struttura `parametri` JSON:**
```json
{
  "durata_giorni": 5,
  "tipo_corso": "centrale",
  "regione": null,
  "materie": [
    { "nome": "Psicologia", "ore": 3, "area_id": "uuid-psi" },
    { "nome": "Regolamento di Gioco", "ore": 4, "area_id": "uuid-reg" },
    { "nome": "Preparazione Atletica", "ore": 6, "area_id": "uuid-prep" }
  ],
  "calendario": {
    "giorni_settimana": ["lun", "mar", "mer", "gio", "ven"],
    "fasce_tipo": [
      { "inizio": "09:00", "fine": "11:00", "materia": "Psicologia" },
      { "inizio": "11:15", "fine": "13:00", "materia": "Regolamento di Gioco" },
      { "inizio": "14:00", "fine": "17:00", "materia": "Preparazione Atletica" }
    ]
  }
}
```

**Flusso creazione corso da template:**
1. Admin seleziona template → form pre-compilato
2. Inserisce data inizio corso
3. Sistema genera automaticamente `corso_eventi` per tutti i giorni del corso
4. Per ogni evento: suggerisce docenti per area → admin assegna con un click
5. Docente assegnato riceve notifica/invito e vede l'evento nel proprio calendario

**Tabella oraria condivisibile:** dal calendario corso, export griglia giorni × fasce orarie (PDF/stampa), distinto dal PDF programma.

### B6. Sezione Calendari (super_admin/admin)

Nuova sezione dedicata con vista settimanale/mensile di tutti i corsi e docenti:

```
Calendari
[Filtro: Tutti i corsi ▼] [Filtro: Tutti i docenti ▼] [Settimana ▼]

┌──────┬────────────────┬────────────────┬────────────────┐
│      │ Lunedì 12/05   │ Martedì 13/05  │ Mercoledì...   │
├──────┼────────────────┼────────────────┼────────────────┤
│ 9:00 │ [UEFA A]       │                │ [Preparatori]  │
│      │ Psicologia     │                │ Reg. di Gioco  │
│      │ Nista          │                │ Rossi          │
└──────┴────────────────┴────────────────┴────────────────┘
```

**Nota nomenclatura:** la voce nella sidebar super_admin/admin si chiama **"Calendari"** (plurale — aggrega tutti i corsi e docenti con filtri). La voce nella sidebar docente si chiama **"Calendario"** (singolare — vista personale del docente con solo i propri eventi). Sono due componenti distinti sulle stesse tabelle `corso_eventi`.

### B7. PDF Programma — Miglioramenti

1. **Grafica giornata:** gerarchia tipografica più chiara, colori alternati, separatori mattina/pomeriggio
2. **Copertina:** località corso + range date (primo → ultimo giorno del programma)
3. **Anteprima popup:** bottone "Scarica PDF" → modal con `<iframe>` preview + bottone "Scarica"

**File toccati:**
- `app/(dashboard)/super-admin/corsi/[id]/programma/export-pdf/route.tsx`
- `app/(dashboard)/docente/corsi/[id]/programma/export-pdf/route.tsx`
- `ProgrammaPageClient.tsx` nelle cartelle super-admin, admin e docente (il ruolo studente non ha export PDF)

### B8. Rename Quiz → Esami e Prove Intermedie

- Solo testo visibile UI: label, titoli pagina, breadcrumb, sidebar
- Non tocca: nomi tabelle DB, URL route, nomi file componenti
- Eseguito con grep sistematico + edit mirato

---

## Stream C — Business Docs

### C1. Business Plan — Costi Operativi

Documento `docs/business-plan-costi-2026-05-08.md` con 3 fasce:

| Fascia | Corsisti | Corsi | Totale/mese stimato | Scenario |
|---|---|---|---|---|
| Small | 50 | 5 | ~€0-25 | Pilota / anno 1 |
| Medium | 300 | 30 | ~€95-120 | Crescita operativa |
| Large | 1.000+ | 100 | ~€650-700 | Scala nazionale |

Servizi: Supabase, Vercel, Resend, Expo/EAS, Sentry, dominio coachlab.it.
Include raccomandazione piano per ciascuna fascia e note su scaling storage.

### C2. Pitch Deck — 12 slide (benefit-first)

Documento PowerPoint tramite MCP PowerPoint. Tono concreto e diretto.

| # | Slide | Messaggio principale |
|---|---|---|
| 1 | Cover | CoachLab — La formazione degli allenatori, finalmente digitale |
| 2 | Il problema | Gestire un corso costa ore ogni settimana |
| 3 | Con CoachLab | Tutto in un posto. Ogni ruolo vede solo quello che serve |
| 4 | Per l'ente | Da ore a minuti: crei un corso in 3 click con il template |
| 5 | Per il docente | Programma, presenze e materiali sempre aggiornati |
| 6 | Per il corsista | Tutto il corso nel telefono. Nessuna email persa |
| 7 | Tracciabilità | Ogni presenza, voto, documento — tutto registrato |
| 8 | Scalabile | Da 50 a 1.000 corsisti, costi prevedibili |
| 9 | Già live | In produzione su coachlab.it — testato con corsi reali |
| 10 | Roadmap 30gg | Archivio File, Template, Calendario condiviso, Admin multipli |
| 11 | Prossimi passi | Demo guidata / accordo pilota / licenza annuale |
| 12 | Q&A | Logo + contatti |

**Script demo live (10-15 min):**
1. Super_admin crea corso da template → calendario generato (2 min)
2. Admin assegna docenti per materia/area (1 min)
3. Docente: vede calendario, registra presenze, carica materiale (3 min)
4. Studente (mobile): programma, file, esame (3 min)
5. Super_admin: report presenze + export PDF programma (2 min)

---

## Note operative

- Dev server: `cd ~/figc-lms && npm run dev` → `localhost:3001`
- Supabase migrations: eseguire tramite SQL Editor Supabase (non CLI) per le nuove tabelle
- Nessun deploy su Vercel finché il merge in `main` non è completato e testato in locale
- Aggiustamenti UX/feature dopo la fase di test utente — gestiti in sessioni successive
