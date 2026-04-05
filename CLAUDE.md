# CoachLab LMS — Contesto di sviluppo

## Progetto
CoachLab LMS — Portale di formazione allenatori di calcio. Cartella: `/Users/alessandrodanti/figc-lms`.
Guida ripresa sessione: `/Users/alessandrodanti/Desktop/Claude files/Guida CoachLab/CoachLab — Guida Ripresa Sessione 05-04-2026.html`
⚠️ **Nessun riferimento a "FIGC" nell'app** — brand è solo CoachLab (accordo FIGC non ancora attivo)

## Stack
- **Frontend:** Next.js 16 (App Router), Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Email:** Resend
- **Deploy:** Vercel
- **Tailwind v4:** `@import "tailwindcss"` + `@theme inline {}` in globals.css
- **Next.js:** `cookies()` asincrono, params come `Promise<{...}>`
- **Supabase client server-side:** `@supabase/ssr`

## Ruoli
`super_admin` | `docente` | `studente` — route protette con redirect automatico.

## Dati pilota
2 corsi (Roma Test, Milano Test), 4 docenti, 20 corsisti. Password test: `Figc2024!`

## Server locale
```bash
cd /Users/alessandrodanti/figc-lms && npm run dev
# → http://localhost:3000
```

---

## Branding CoachLab (aggiornato Batch 87 finale — Glassmorphism + Navy Nav)
- Logo: `/public/logo-coachlab.png` (PNG trasparente originale)
- **Font:** Plus Jakarta Sans (variabile `--font-jakarta`, caricato via `next/font/google`)
- **Accent teal:** `#0891B2` | **Teal dark:** `#0E7490` | **Navy:** `#1B3768`
- **Background:** `.bg-page-gradient` = `linear-gradient(155deg, #C8D5E8 0%, #D4DFEF 40%, #CDDAEC 70%, #D0DCE8 100%)` — navy sfumato
- **Sidebar:** `.glass` — `rgba(255,255,255,0.75)` + `backdrop-filter:blur(16px)`, border-right bianca
- **Header:** `.glass-header` — `rgba(255,255,255,0.82)` + `backdrop-filter:blur(12px)`
- **Nav active:** `background: #1B3768` + testo `white` + ChevronRight `rgba(255,255,255,0.8)`
- **Nav hover:** `hover:bg-[rgba(27,55,104,0.08)]` + `hover:text-[#1B3768]`
- **Badge notifiche (active):** `rgba(255,255,255,0.25)` bianco | **(inactive):** `#1B3768`
- **Login:** stesso gradient navy sfumato, card glass `rgba(255,255,255,0.85)` + blur
- **Mobile:** header `#0E7490`, tab active `#0891B2`, button primary `bg-teal-DEFAULT`

---

## Fasi sviluppo

| Fase | Stato | Descrizione |
|------|-------|-------------|
| A | ✅ | Completamento funzionale (email, breadcrumb, back-links, report) |
| B | ✅ | Messaggistica interna 1:1 e broadcast |
| C | ✅ | Revisione grafica + rebranding CoachLab |
| D | ✅ | QA finale, test per ruolo, RLS audit, mobile, performance |
| E (Batch 71) | ✅ | Sidebar riorganizzata + Archivio Documenti + Libreria Quiz + Notifiche unificate |
| F (Batch 72-74) | ✅ | Guide interattive + GuideTooltip + Infrastruttura legale GDPR + Cookie Banner |
| G (Batch 75) | ✅ | Registrazione via invito completa (F4) — QR code, phone, docente support |
| H (Batch 76) | ✅ | F5 QA completo per ruolo (studente, docente, super_admin, flusso invito end-to-end) |
| I (Batch 77) | ✅ | F7 Deploy Vercel + dominio custom coachlab.it — SSL attivo, 76 pagine online |
| L (Batch 78) | ✅ | Bonifica FIGC→CoachLab, logo login qualità alta, F6 DPA firmati (Supabase/Vercel/Resend) |
| M (Batch 79) | ✅ | Item 8: Allegati opzionali negli annunci del corso (upload, chip scaricabile, delete) |
| N (Batch 80) | ✅ | Item 0: Valutazione ongoing — pratica ADP + voti aperti + vista studente (mobile-first) |
| O (Batch 81) | ✅ | Bug fix nome conversazioni corso/microgruppo + schema fix DB mobile + nuove feature mobile |
| P (Batch 82) | ✅ | Completamento produzione mobile: Sentry · OTA · Supporto · NetworkBanner · Push hardening |
| Q (Batch 83) | ✅ | Cold-start push · Logout push cleanup · Verifica DB tabelle · Invito docente già completo |
| R (Batch 84) | ✅ | EAS Project registrato (ID: 442c0bab-d2e0-418f-931f-d3fd8fe1942c) · OTA URL configurato · Push guard aggiornato |
| S (Batch 85) | ✅ | Sentry DSN reale configurato — crash reporting attivo in produzione |
| T (Batch 86) | ✅ | Guida pubblicazione App Web + Mobile (HTML+PDF) — tutte le guide aggiornate e salvate |
| U (Batch 87) | ✅ | Restyling grafico completo — Mockup 2 Glassmorphism (Plus Jakarta Sans, teal #0891B2, bg gradient) |
| V (Batch 87b) | ✅ | Finalizzazione design: nav active/hover navy #1B3768, background gradient navy sfumato (#C8D5E8→#D0DCE8), deploy su coachlab.it |

---

## Stato database — Migrations eseguite
**Migration 14 → 22 tutte eseguite in Supabase.**

- 14: `question_library` + `question_library_options`
- 15: `docente_question_library` + timer quiz (`started_at`)
- 16: `category`, `instructions`, `shuffle_questions`, `available_from`, `available_until` su `course_quizzes`
- 17: `quiz_templates` + `quiz_template_questions` + `quiz_template_options`
- 18: `auto_close_on_timer` + grace period su `course_quizzes`
- 19: `course_tag` su `quiz_templates` + RLS `ql_insert`
- 20: `question_categories` (system|personal) + seeding 8 categorie
- 21: `penalty_wrong` + `questions_per_student` su `quiz_templates` e `course_quizzes`
- 22: RLS `ql_update` su `question_library` (fix bug categorie non persistenti)

---

## Sistema quiz — stato completo (Batch 64–70d)
- Timer con countdown, barra colorata (blu→ambra≤5min→rosso≤1min)
- Grace period: `auto_close_on_timer=false` → 25% tempo extra, banner arancione
- Shuffle domande + opzioni
- Schermata istruzioni pre-quiz con checkbox conferma
- `passing_score` = punteggio assoluto in pt (default 18)
- Domande con `points`: 1=standard, 2=difficile
- `penalty_wrong`: −1 per risposta sbagliata, banner pre-quiz
- `questions_per_student`: pool → ogni studente riceve N domande casuali
- Archivio domande (`question_library`) con categorie accordion + bulk assign
- Libreria personale docente (`docente_question_library`) con toggle is_shared
- **CreaTemplateModal — 3 tab:**
  - Tab A Manuale: accordion categorie (anche vuote), clic diretto = aggiunta immediata
  - Tab B Per slot: dropdown categoria con conteggi, ↺ per sostituire singola domanda
  - Tab C Pool studente: stesso accordion, N domande casuali per studente
- Footer sticky sempre visibile; hint titolo cliccabile; re-fetch ad ogni apertura
- QuizRunner: opzioni mescolate on mount

---

## Messaggistica interna (Fase B)
- Tabelle: `conversations`, `conversation_participants`, `messages`
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE messages`
- Routes: `/messaggi` (lista), `/messaggi/[conversationId]` (chat)
- API: `/api/messaggi/crea` | `/api/messaggi/invia` | `/api/messaggi/leggi` | `/api/messaggi/cerca-utenti`
- Sidebar: badge messaggi non letti (calcolato in `layout.tsx`)
- **Attuale:** broadcast 1:1 (un messaggio crea conversazioni separate per ogni destinatario)

---

## Batch 86 — Guida Pubblicazione App Web + Mobile (31 mar 2026) ✅

### Guide create/aggiornate
- **`CoachLab — Guida Pubblicazione App Web + Mobile.html`** + PDF (1.89 MB)
  - 10 sezioni: infrastruttura/costi, web app, prerequisiti mobile, asset, iOS App Store, Google Play, OTA Updates, Sentry, Push, Checklist finale
- **EAS CLI installato:** `eas-cli@18.4.0` globale
- **EAS Project:** `@chuckbass88/coachlab-lms` — ID `442c0bab-d2e0-418f-931f-d3fd8fe1942c`
- **Sentry:** org `coachlab-5q`, DSN attivo in `lib/sentry.ts`
- Guide salvate in: `/Users/alessandrodanti/Desktop/Claude files/Guida CoachLab/`

### Stato app mobile — production-ready ✅
| Componente | Stato |
|-----------|-------|
| EAS Project ID | ✅ `442c0bab-d2e0-418f-931f-d3fd8fe1942c` |
| OTA Updates URL | ✅ `https://u.expo.dev/442c0bab-...` |
| Sentry DSN | ✅ attivo (crash reporting in prod) |
| Push notifications | ✅ con projectId reale |
| Build command | `eas build --platform all --profile production` |
| Submit command | `eas submit --platform ios && eas submit --platform android` |

### ⚠️ Prossimi passi manuali richiesti
1. **Apple Developer Account** ($99/anno) — per firma iOS e TestFlight
2. **Google Play Console** ($25 una tantum) — per distribuzione Android
3. **Icone e screenshot** per i Store (spec nella guida HTML/PDF)
4. **`eas.json`** — aggiornare `appleId`, `ascAppId`, `appleTeamId` quando account attivo

---

## Batch 85 — Sentry DSN configurato (30 mar 2026) ✅

### Sentry — crash reporting attivo
- **Org:** `coachlab-5q`
- **Project:** `react-native`
- **DSN:** `https://97ad91b97a118c38f9071e8f1e96abd7@o4511135584616448.ingest.de.sentry.io/4511135588876368`
- `lib/sentry.ts` — DSN reale impostato; rimosso guard placeholder (non più necessario)
- Crash reporting attivo in produzione; no-op in dev (`beforeSend` filtra eventi dev)
- TypeScript: ✅ 0 errori

### Stato finale — app mobile production-ready ✅
Tutte le azioni manuali completate:
- EAS Project ID: `442c0bab-d2e0-418f-931f-d3fd8fe1942c`
- Sentry DSN: configurato e attivo
- Prossimo passo: `eas build --platform all --profile production`

---

## Batch 84 — EAS Project registrato + OTA configurato (30 mar 2026) ✅

### EAS Project
- Account: `chuckbass88` (info.agrifutura@gmail.com)
- Project: `@chuckbass88/coachlab-lms`
- **Project ID: `442c0bab-d2e0-418f-931f-d3fd8fe1942c`**
- Dashboard: https://expo.dev/accounts/chuckbass88/projects/coachlab-lms

### app.json aggiornato
- `extra.eas.projectId` = `442c0bab-d2e0-418f-931f-d3fd8fe1942c` (impostato da EAS CLI)
- `updates.url` = `https://u.expo.dev/442c0bab-d2e0-418f-931f-d3fd8fe1942c`
- `owner` = `chuckbass88`
- Push notifications ora funzionano con il vero projectId

### Push guard aggiornato
- `hooks/usePushNotifications.ts` — rimosso check per placeholder, ora solo verifica `!projectId`

### Prossimo step produzione
```bash
# OTA update (senza passare per App Store)
eas update --branch production --message "Prima release"

# Build produzione (una tantum per App Store)
eas build --platform ios --profile production
eas build --platform android --profile production
```

---

## Batch 83 — Cold-start push + Logout cleanup (30 mar 2026) ✅

### Cold-start deep linking da notifica push
- `app/_layout.tsx` — `Notifications.getLastNotificationResponseAsync()` dopo `getSession()`: naviga a `data.url` se app aperta da tap notifica con app chiusa
- Guard `coldStartHandled` ref per evitare doppio navigate
- Delay 500ms per attendere inizializzazione router

### Logout push token cleanup
- `removePushTokenOnLogout()` in `_layout.tsx` — elimina record in `push_subscriptions` per user_id + expo_token al logout
- Chiamata in `onAuthStateChange` quando session diventa null

### Verifica DB (via Supabase SQL)
- `notification_preferences` ✅ colonne corrette
- `push_subscriptions` ✅ presente
- `invite_tokens` ✅ presente
- Registrazione docente via invito: già completamente implementata (web)

### TypeScript: ✅ 0 errori

---

## Batch 82 — Completamento produzione app mobile (30 mar 2026) ✅

### Sentry crash reporting
- `@sentry/react-native` v7.11.0 installato
- **`lib/sentry.ts`** — `initSentry()`, `captureError()`, `setSentryUser/clearSentryUser()`, `addBreadcrumb()`
- **`components/ErrorBoundary.tsx`** — integrato con Sentry (`captureError` in `componentDidCatch`); aggiunto bottone "Segnala problema"
- **`app/_layout.tsx`** — `initSentry()` al boot; `setSentryUser/clearSentryUser` su login/logout
- ⚠️ **Azione:** sostituire `INSERISCI_IL_TUO_DSN_QUI` in `lib/sentry.ts`

### OTA Updates
- `expo-updates` v55.0.16 installato
- **`eas.json`** creato: profili `development`, `preview`, `production`
- **`app.json`** aggiornato: `updates.url`, `runtimeVersion`, plugin `expo-updates`, fix `android.adaptiveIcon`
- **`lib/updates.ts`** — `checkAndApplyUpdate()` (no-op in dev), `getCurrentUpdateId()`
- ⚠️ **Azione:** `npx eas-cli login && npx eas project:init` → sostituire `INSERISCI_EAS_PROJECT_ID`

### Supporto in Impostazioni
- Sezione "Supporto" con mailto, sito web, segnala problema (prefilled con versione app + updateId)
- Versione app da `Constants.expoConfig.version` (non più hardcodata)
- Cookie Policy aggiunta nella sezione Legale

### NetworkBanner offline
- `@react-native-community/netinfo` installato
- **`components/NetworkBanner.tsx`** — banner animato rosso/verde per stato connessione
- Montato in `app/_layout.tsx`

### Push notifications hardening
- **`hooks/usePushNotifications.ts`** — routing automatico su tap, guard EAS projectId, `captureError`, `addBreadcrumb`

### TypeScript: ✅ 0 errori (`tsc --noEmit --skipLibCheck`)

---

## Batch 81 — Bug fix conversazioni + Schema fixes mobile (30 mar 2026) ✅

### Bug fix: nome corso/microgruppo nelle conversazioni dirette

**Problema:** quando docente/admin inviava un messaggio a un corso o microgruppo, ogni conversazione 1:1 creata non riceveva il campo `name`. La logica di display per `type = 'direct'` mostrava sempre il nome dell'interlocutore, ignorando `conv.name`. Risultato: nella lista messaggi e nell'header della chat appariva il nome dello studente invece del nome del corso/microgruppo.

**Fix applicati — App Mobile:**
- `app/messaggi/nuovo.tsx` — `findOrCreateConversation` accetta ora param opzionale `convName`; `handleSendGruppo` deriva `convName` (`"GruppoX — CorsoY"` o solo `"CorsoY"`) e lo passa → conversazione creata con `name` impostato
- `app/tabs/messaggi.tsx` — logica display: per `direct` usa `conv.name` se presente, poi fallback al nome partner; per `group`/`broadcast` usa `conv.name` o join dei nomi
- `app/messaggi/[conversationId].tsx` — header ora rispetta `conv.name` per conversazioni dirette con nome esplicito (nome corso/microgruppo come titolo, nome interlocutore come info aggiuntiva)

**Fix applicati — App Web:**
- `app/api/messaggi/invia-gruppo/route.ts` — fetcha `courses.name` + opzionalmente `course_groups.name`, costruisce `convName`, lo salva nel campo `name` della conversazione; fix notifiche (campi `message`/`read` → `type`/`body`/`data`)
- `app/(dashboard)/messaggi/layout.tsx` — per `direct`: usa `conv.name` quando presente, altrimenti mostra nome interlocutore
- `app/(dashboard)/messaggi/[conversationId]/page.tsx` — `displayName` rispetta `conv.name`; se presente, nome interlocutore diventa `displaySub`
- `app/api/messaggi/crea/route.ts` — fix notifica: campi obsoleti `message`/`read` → `type`/`body`/`data`

### Schema fixes DB (verificati via Supabase SQL)

Trovati e corretti 7 errori di schema in 6 file mobile:

| Errore | Tabella/colonna corretta | File corretti |
|--------|--------------------------|---------------|
| `course_enrollments.user_id` | → `student_id` | `home.tsx`, `corsi.tsx`, `calendario.tsx`, `corsi/[courseId]/index.tsx`, `presenze.tsx` |
| `from('quizzes')` | → `from('course_quizzes')` | `corsi/[courseId]/index.tsx`, `quiz/[quizId].tsx` |
| `course_quizzes.duration_minutes` | → `timer_minutes` | `quiz/[quizId].tsx` |
| `quiz_attempts.user_id` | → `student_id` | `quiz/[quizId].tsx` |
| `quiz_attempts.completed_at` | → `submitted_at` | `quiz/[quizId].tsx` |
| `quiz_attempts.answers` (colonna inesistente) | → insert in `quiz_answers` | `quiz/[quizId].tsx` |
| `session_presences` (tabella inesistente) | → `attendances` (col: `student_id`, `present`) | `presenze.tsx` |

### Nuove feature mobile

- **Email studente tappabile** — in `corsi/[courseId]/index.tsx` tab Partecipanti, email wrapped in `TouchableOpacity` con `Linking.openURL('mailto:...')` → apre mail client
- **Crea annuncio da mobile** — tab Annunci visibile ai docenti con bottone "Nuovo annuncio"; modal con titolo + corpo; insert in `course_announcements`; notifica in-app a tutti gli studenti iscritti (legge `student_id` da `course_enrollments`)
- **Quiz answers corrette** — dopo upsert `quiz_attempts`, le singole risposte vengono salvate in `quiz_answers` (tabella corretta, incluso `is_correct` da `quiz_options`)

### File modificati
| File | Tipo modifica |
|------|--------------|
| `app/messaggi/nuovo.tsx` | Bug fix nome conv + convName in find-or-create |
| `app/tabs/messaggi.tsx` | Bug fix display nome conv |
| `app/messaggi/[conversationId].tsx` | Bug fix header nome conv |
| `app/tabs/home.tsx` | Schema fix `student_id` |
| `app/tabs/corsi.tsx` | Schema fix `student_id` |
| `app/tabs/calendario.tsx` | Schema fix `student_id` |
| `app/corsi/[courseId]/index.tsx` | Schema fixes multipli + email tappabile + crea annuncio |
| `app/corsi/[courseId]/quiz/[quizId].tsx` | Schema fixes quiz + quiz_answers |
| `app/sessioni/[sessionId]/presenze.tsx` | Schema fix attendances |
| `app/api/messaggi/invia-gruppo/route.ts` (web) | Bug fix nome conv + fix notifiche |
| `app/api/messaggi/crea/route.ts` (web) | Fix notifiche |
| `app/(dashboard)/messaggi/layout.tsx` (web) | Bug fix display nome conv |
| `app/(dashboard)/messaggi/[conversationId]/page.tsx` (web) | Bug fix display nome conv |

---

## Batch 79 — Item 8: Allegati negli annunci (24 mar 2026) ✅

### Feature
Docente e admin possono allegare un file opzionale (PDF, DOCX, XLSX, PPT, JPG, PNG, ZIP) a ogni annuncio del corso. Gli studenti vedono e scaricano l'allegato direttamente dalla bacheca.

### DB Migration — `course_announcements_attachments`
```sql
ALTER TABLE course_announcements
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_size bigint,
  ADD COLUMN IF NOT EXISTS attachment_type text;
```

### File modificati
| File | Modifica |
|------|----------|
| `app/api/annunci/create/route.ts` | Da JSON a FormData; upload opzionale in `course-materials/announcements/{courseId}/{ts}.ext`; rollback storage se insert fallisce |
| `app/api/annunci/[id]/route.ts` | DELETE ora rimuove anche il file storage se `attachment_url` presente |
| `app/(dashboard)/docente/corsi/[id]/annunci/NuovoAnnuncioForm.tsx` | Zona upload drag&drop opzionale; mostra nome+dimensione; bottone X per rimuovere; switch da `fetch JSON` a `FormData` |
| `app/(dashboard)/docente/corsi/[id]/annunci/page.tsx` | Select +4 colonne; chip allegato scaricabile (icona Paperclip + nome + KB + Download) |
| `app/(dashboard)/studente/corsi/[id]/annunci/page.tsx` | Stesso chip; studente vede e scarica in nuova tab |

### Storage
- Bucket: `course-materials` (già esistente)
- Path: `announcements/{courseId}/{timestamp}.{ext}`
- Cleanup automatico su DELETE annuncio

### Deploy
- Build ✅ zero errori TypeScript
- Deploy ✅ su coachlab.it

---

## Batch 78 — Bonifica FIGC + Logo + DPA (23 mar 2026) ✅

### Bonifica brand FIGC → CoachLab
- **Grep completo** su tutta la codebase: trovati 3 riferimenti FIGC nell'app reale
- `app/(dashboard)/studente/corsi/[id]/attestato/page.tsx` — commento `{/* Header FIGC */}` → CoachLab
- `app/(dashboard)/docente/corsi/[id]/presenze/foglio/[sessionId]/page.tsx` — stesso fix commento
- `app/(dashboard)/super-admin/utenti/UtentiClient.tsx` — placeholder `mario@figclms.it` → `mario@coachlab.it`
- Verifica finale: **zero riferimenti FIGC** rimasti in `app/`, `components/`, `lib/`

### Logo login alta qualità
- `app/login/page.tsx`: sostituito `logo-coachlab-white.png` (132KB, bassa qualità) con `logo-coachlab.png` (204KB, PNG originale) + CSS `filter: brightness(0) invert(1)`
- Risultato: logo nitido, senza sgranatura, rendering perfetto su sfondo blu scuro

### F6 — DPA firmati ✅
- **Supabase DPA** — firmato digitalmente via PandaDoc (ref: ZUMDZ-JX9Z6-JUH4D-BLRSG, 23/03/2026 22:15 UTC)
- **Vercel DPA** — PDF pubblico salvato (piano Hobby, vincolante via ToS)
- **Resend DPA** — PDF pubblico salvato
- File in: `~/Desktop/Progetti 2026 Claude/CoachLab/Legal e varie/`

### Vercel errori email
- 1 solo deployment in errore (~2h prima del batch): `figc-jmsdkg35e` — build fallita per TypeScript
- Tutti gli altri deployment (8 totali) sono ● Ready — coachlab.it funzionante ✅

### Deploy
- Build ✅ zero errori — deployato su coachlab.it

---

## Batch 77 — F7: Deploy Vercel + Dominio custom (23 mar 2026) ✅

### Deploy
- **Vercel CLI** installata e usata per tutto il processo (no browser)
- **Fix** `lib/push.ts` — guard su VAPID keys (`if NEXT_PUBLIC_VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY`) per evitare crash a build time senza env vars
- **7 env vars** aggiunte su Vercel production: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- **76 pagine** compilate e deployate in ~60s

### Dominio
- `coachlab.it` acquistato su IONOS
- Record DNS configurati su IONOS: `A @ 76.76.21.21` + `A www 76.76.21.21`
- Dominio aggiunto a Vercel: `vercel domains add coachlab.it` + `www.coachlab.it`
- SSL certificato emesso automaticamente da Vercel
- `NEXT_PUBLIC_SITE_URL` aggiornato a `https://coachlab.it` e re-deployato

### Supabase Auth aggiornato
- Site URL → `https://coachlab.it`
- Redirect URLs → `https://coachlab.it/**` e `https://www.coachlab.it/**`

### URL finali
- 🌐 **https://coachlab.it** — produzione ✅
- 🌐 **https://figc-lms.vercel.app** — alias Vercel (sempre attivo)
- 📊 Dashboard Vercel: `https://vercel.com/chuckbass88s-projects/figc-lms`

### Prossimo step
- ~~F6~~ ✅ DPA firmati/salvati tutti e tre
- **Testi legali** — validare da avvocato GDPR (testi già online, pendente validazione)

---

## Batch 76 — F5: QA completo per ruolo (23 mar 2026) ✅

### Risultati QA

| Ruolo | Area | Esito |
|-------|------|-------|
| Studente | Login, dashboard, I miei corsi, quiz, task, presenze, messaggi, profilo | ✅ |
| Docente | Login, dashboard, I miei corsi, link invito (QR), materiali, presenze, task, quiz | ✅ |
| Super_admin | Login, dashboard, gestione corsi, utenti, archivio documenti, report | ✅ |
| Flusso invito | Generazione token, form registrazione, creazione utente Auth + profilo + enrollment, redirect dashboard | ✅ |

### Note tecniche
- **Form invito (UI):** React synthetic events richiedono `nativeInputValueSetter` + `dispatchEvent('input'/'change')` per triggerare `useState` — workaround documentato
- **API `/invito/registra` testata via curl:** HTTP 200, utente creato con role=studente, phone salvato, enrollment active
- **UI form testata via JS injection:** Compilazione + submit → redirect corretto a `/studente/corsi/[courseId]`
- **Protezione ruolo:** super_admin accede all'URL invito → "Accesso non disponibile — riservato ai corsisti" ✅
- **Cleanup:** utenti test `mario.bianchi.qa` e `luca.rossi.qa` eliminati da auth.users

### Prossimo step
- **F6** — Firma DPA Supabase · Vercel · Resend (azione manuale Alessandro: Settings → Legal)
- **F7** — Deploy Vercel + dominio custom (acquisto dominio, env vars produzione)
- Testi legali → validare da avvocato GDPR (sostituire placeholder)

---

## Batch 75 — F4: Registrazione via invito completa (23 mar 2026) ✅

### Cosa era già implementato (trovato in codebase)
- `/invito/[token]/page.tsx` — server component: valida token su `courses.invite_token`, form o auto-iscrizione per utenti già autenticati
- `/invito/[token]/RegistrazioneForm.tsx` — form con nome, cognome, email, cellulare, password, checkbox Privacy + Termini obbligatorie
- `/api/invito/registra/route.ts` — crea utente Supabase Auth + profilo + enrollment
- `/api/admin/genera-token-invito/route.ts` — genera UUID su `courses.invite_token`
- `super-admin/corsi/[id]/LinkInvitoBtn.tsx` — modale con QR code + copia link + rigenera

### Cosa era mancante (aggiunto in questo batch)
- **DB migration** — `profiles.phone` (colonna text opzionale) → eseguita via `apply_migration`
- **Fix `/api/invito/registra`** — `cellulare` ora salvato in `profiles.phone` se compilato
- **Docente page** — aggiunto `LinkInvitoBtn` in `/docente/corsi/[id]/page.tsx` + `invite_token` nel fetch
- **API genera-token** — accetta anche ruolo `docente` (con verifica che sia istruttore del corso)

### Build
- ✓ `Compiled successfully in 2.5s` — zero errori TypeScript

---

## Batch 74 — Infrastruttura legale GDPR + Cookie (22 mar 2026) ✅

### Pagine legali
- `app/privacy/page.tsx` — Privacy Policy completa (art. 13 GDPR), layout gradient CoachLab, avviso validazione legale, 7 sezioni, link a Termini · Cookie · Login
- `app/termini/page.tsx` — Termini di Servizio, 6 sezioni, stesso layout professionale
- `app/cookie/page.tsx` — Cookie Policy **nuova**, tabella cookie (tecnici vs analytics), 5 sezioni

### Cookie Banner
- `components/CookieBanner.tsx` — Client component, fixed bottom, localStorage `coachlab_cookie_consent`, azioni: "Accetta tutti" / "Solo necessari" / X
- `app/layout.tsx` — Import + render `<CookieBanner />` nel root layout

### Footer login
- `app/login/page.tsx` — Aggiunto footer con link: Privacy Policy · Termini · Cookie

### Piano Pubblicazione
- `~/Desktop/CoachLab-Piano-Pubblicazione.html` — documento interattivo checklist (pre-lancio, GDPR, deploy, costi €47-67/mese, pricing, mobile, DPA)

### Prossimo step
- **F4** — Registrazione via invito `/invito/[token]`
- **F5** — QA per ruolo completo
- **F6** — Firma DPA Supabase/Vercel/Resend (azione manuale)
- **F7** — Deploy Vercel + dominio custom

---

## Batch 73 — Guide interattive + GuideTooltip + Bug fix (22 mar 2026) ✅

### GuideTooltip ⓘ aggiunto in
- `components/messaggi/MessaggiShell.tsx` — sidebar messaggi (title "Messaggi")
- `app/(dashboard)/studente/task/page.tsx` — h2 "Le Mie Task"
- `app/(dashboard)/docente/task/page.tsx` — h2 "Le Mie Task"
- `app/(dashboard)/studente/quiz/page.tsx` — h2 "I Miei Quiz"
- `app/(dashboard)/studente/presenze/page.tsx` — h2 "Le mie presenze"

### Guide interattive create
- `components/guida/GuideTooltip.tsx` — popover inline ⓘ
- `components/guida/guideDataStudente.ts` — 11 sezioni + screenshot reali
- `components/guida/guideDataDocente.ts` — 10 sezioni + screenshot reali
- `components/guida/GuideClient.tsx` — componente interattivo (ricerca, accordion, chip, progress)
- `app/(dashboard)/guida/page.tsx` — hub + redirect per ruolo
- `app/(dashboard)/guida/studente/page.tsx` + `docente/page.tsx`
- `public/guide/` — 24 screenshot Puppeteer (14 studente + 10 docente)

### Bug fix
- **Nome profilo** non aggiornato in header/sidebar dopo modifica → aggiunto `router.refresh()` in `ProfiloClient.tsx`
- **Messaggi layout** conversazioni non visibili → admin client + `.neq('is_suspended', true)`
- **Terminal alias `lms`** → aggiunto in `~/.bash_profile`

---

## Batch 71 — Sidebar + Archivio Documenti (22 mar 2026) ✅

### Sidebar riorganizzata
- **super_admin**: Panoramica Quiz + Archivio Domande → `Libreria Quiz` (`/super-admin/libreria-quiz`); Invia Notifiche + Le mie notifiche → `Notifiche` (`/notifiche?tab=invia`); aggiunta voce `Archivio Documenti` (`/archivio`)
- **docente**: I Miei Quiz + Mia Libreria Domande → `Libreria Quiz` (`/docente/libreria-quiz`); Invia Notifica + Le mie notifiche → `Notifiche`; aggiunta voce `Archivio Documenti`
- **studente**: "Le mie notifiche" → "Notifiche" (solo label, nessun tab Invia)

### File nuovi/modificati
- `components/layout/Sidebar.tsx` — NAV_ITEMS aggiornati, `FolderOpen` da lucide aggiunto
- `app/(dashboard)/notifiche/page.tsx` — role-aware con tab "Le mie notifiche" / "Invia notifica"
- `app/(dashboard)/docente/libreria-quiz/page.tsx` — RSC composition (QuizPage + DomandePage)
- `app/(dashboard)/super-admin/libreria-quiz/page.tsx` — RSC composition (AdminQuizPage + LibreriaDomandePage)
- `app/(dashboard)/archivio/page.tsx` — server component, solo docente/admin
- `app/(dashboard)/archivio/ArchivioDocumentiClient.tsx` — upload file, link, filtri, delete

### DB/Storage (già presenti da progetto mobile)
- Tabella `document_library` + `document_course_links` + bucket `document-library`

---

## Upgrade in backlog (da sviluppare)

### 0. Valutazione ongoing per corso ✅ (Batch 80)
**Idea:** sistema di valutazione continua che aggrega automaticamente i risultati del corsista nel corso.

**Componenti da valutare:**
- **Task** — voto numerico (già presente come `grade` su `task_submissions`)
- **Quiz intermedi** — punteggio % o punti (già presente su `quiz_attempts`)
- **Valutazione aperta docente** — voto numerico + testo libero (da creare: tabella `course_evaluations`)

**Proposta architettura (da discutere prima dello sviluppo):**

_Schema DB suggerito:_
```sql
-- Valutazioni libere del docente (voto + commento)
CREATE TABLE course_evaluations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid REFERENCES courses(id),
  student_id uuid REFERENCES profiles(id),
  docente_id uuid REFERENCES profiles(id),
  voto numeric(4,2),           -- es. 8.5
  commento text,               -- testo libero
  tipo text DEFAULT 'generale', -- 'generale' | 'orale' | 'pratica' | 'comportamento'
  created_at timestamptz DEFAULT now()
);

-- Vista calcolata del voto finale (o colonna calcolata)
-- media_ponderata = (task_avg * peso_task%) + (quiz_avg * peso_quiz%) + (eval_avg * peso_eval%)
```

_Pesi configurabili per corso:_
```sql
ALTER TABLE courses ADD COLUMN peso_task integer DEFAULT 33;
ALTER TABLE courses ADD COLUMN peso_quiz integer DEFAULT 33;
ALTER TABLE courses ADD COLUMN peso_valutazione integer DEFAULT 34;
```

_Schermate da creare:_
- **Docente** → tab "Valutazione" nel dettaglio corso: lista corsisti con voti task/quiz/liberi + media ponderata + form inserimento valutazione
- **Studente** → sezione "Il mio andamento" nel corso: grafico/tabella voti con media
- **Super Admin** → report valutazioni per corso

**Note:** sviluppare solo quando richiesto esplicitamente — richiede migrazione DB + UI non banale.

### 1. Registrazione corsista via invito ✅ (Batch 75)
- Pagina `/invito/[token]` — validazione token, form registrazione, auto-iscrizione
- Campi: Nome, Cognome, Email, Cellulare (→ `profiles.phone`), checkbox Privacy+Termini
- API: crea Supabase Auth + profilo + enrollment; login automatico post-registrazione
- `LinkInvitoBtn`: modale QR code + copia link + rigenera (super_admin + docente istruttore)
- Token: `courses.invite_token` (UUID) generato on-demand, rigenerabile

### 2. Registrazione docente via invito ⏳
- Serve meccanismo separato (il flusso corsista assegna sempre ruolo `studente`)
- **Opzione 1:** token speciale con `role=docente` salvato in DB
- **Opzione 2:** pagina separata `/invito-docente/[token]`
- **Opzione 3:** campo ruolo incluso nel token come claim
- Potrebbe servire tabella `invite_tokens` (token, role, used_at, created_by)

### 3. Messaggistica stile WhatsApp ⏳
- Chat di gruppo vere (non broadcast 1:1)
- Lato docente: sidebar chat, crea conversazioni (1:1 | microgruppo | corso intero)
- Lato corsista: vede solo chat di appartenenza (docente | microgruppo | corso)
- Richiede campo `type` (direct|group) e `group_id`/`course_id` su `conversations`
- Sprint separato — pianificare dopo gli upgrade correnti

### 4. Materiali e task per microgruppo/singolo ⏳
- `course_materials`: aggiungere `target_type` (all|group|student) + `target_id`
- `tasks`: stessa struttura
- Il corsista vede solo contenuti destinati a lui o al suo microgruppo
- Query: `target_type=all OR (group AND target_id IN microgruppi) OR (student AND target_id=uid)`

### 5. Parte legale ✅ (Batch 74)
- Pagine statiche: `/privacy`, `/termini`, `/cookie` → implementate con layout professionale
- Banner consenso cookie → `components/CookieBanner.tsx` in root layout
- Footer login page con link ai 3 documenti → aggiunto
- Checkbox nel form registrazione via invito → da fare in F4
- **⚠️ Pendente:** testi legali da far validare da avvocato GDPR (placeholder attivi)

### 6. Dashboard upgrade ⏳
- Tutti i widget: testo esplicativo accanto alle icone (es. "12 corsi attivi" non solo icona+12)
- Super-admin: widget prioritari:
  1. Corsi attivi (con data fine, docente, % presenze)
  2. Scadenze prossime (entro 7gg: sessioni + task scadenza)
  3. Task in attesa di valutazione (contatore + lista)
  4. Quiz recenti non revisionati
- Docente: solo testo esplicativo, non stravolgere struttura
- **Fare solo quando richiesto esplicitamente**

### 7. Loghi qualità ✅ (Batch 78)

### 8. Allegati negli annunci del corso ✅ (Batch 79)
**Richiesta:** docente/admin può allegare un documento (tipicamente PDF, max ~5MB) a un annuncio di corso.

**Schema DB:**
```sql
ALTER TABLE course_announcements
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_size bigint,
  ADD COLUMN IF NOT EXISTS attachment_type text; -- es. 'PDF', 'DOCX'
```
**Storage:** riusare bucket `course-materials` con path `announcements/{courseId}/{timestamp}.ext`

**UI da aggiornare:**
- Form crea/modifica annuncio (docente + super_admin) → aggiungere zona upload file (drag & drop o click, stile MaterialiClient)
- Card annuncio (lato studente + docente) → se presente allegato, mostrare chip scaricabile con icona file + nome + dimensione

**API:** aggiornare `/api/annunci/crea` e `/api/annunci/modifica` (o crearle se non esistono) per gestire FormData con file opzionale

**Note:** file opzionale, non obbligatorio — l'annuncio funziona anche senza allegato come adesso.
- Logo login: ora usa `/public/logo-coachlab.png` (204KB, PNG trasparente originale) con `filter: brightness(0) invert(1)` per renderlo bianco su sfondo scuro — qualità ottima
- Logo sidebar: già usava `logo-coachlab.png` in box bianco — ok
- Logo mobile (invito): `logo-coachlab.png` originale su bg chiaro — ok
- `logo-coachlab-white.png` (132KB, vecchio) non più usato nell'app

---

## Deliverable finali (Fase E — dopo tutti gli upgrade)
1. **Pacchetto sorgente** per sviluppatore esterno: codice + documento architettura non tecnico
2. **Guide utente** per ruolo: Super Admin, Docente, Corsista (linguaggio semplice)
3. **Guide interattive** (tour guidato in-app per ogni ruolo)

---

## Regole di comportamento Claude (sempre attive)

### 1. Stato visibile
Ogni risposta inizia con una riga di stato:
```
📍 Stato: [cosa sto facendo]  |  ⚡ Azione: [prossimo passo]
```

### 2. Avanzamento task
Per task multi-step mostrare progresso:
```
[██████░░░░] 60% — Step 3/5: TypeScript check
```

### 3. Conferma completamento
Al termine di ogni sviluppo, includere sempre un blocco:
```
✅ COMPLETATO — [nome feature]
📋 Cosa è cambiato: ...
🚀 Prossimo passo suggerito: ...
```

### 4. Prima di sviluppare
Spiegare sempre il piano e chiedere conferma prima di eseguire modifiche.

### 5. Tool mancanti
Proporre proattivamente MCP/tool utili non ancora installati.

---

## Note operative
- `npm install`: usare `--cache /tmp/npm-cache` se problemi di permessi
- `next.config.ts`: `turbopack: { root: path.resolve(__dirname) }` — fix workspace root detection
- `/Users/alessandrodanti/package-lock.json` rinominato `.bak` (era playwright spurio — causa errore tailwindcss)
- Supabase SQL Editor: per eseguire migrations non ancora eseguite
