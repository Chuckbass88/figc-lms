# Stream C — Business Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produrre il business plan sui costi operativi (3 fasce) e il pitch deck PowerPoint (12 slide benefit-first) con script demo live per la presentazione al datore di lavoro entro il 15 maggio 2026.

**Architecture:** Stream indipendente — nessun codice app, solo documenti. Business plan in Markdown, pitch deck via MCP PowerPoint. Nessun worktree necessario, i file vanno in `docs/`.

**Tech Stack:** Markdown, MCP PowerPoint (mcp__PowerPoint__By_Anthropic___*). Screenshot dell'app da `localhost:3001` per il deck.

---

## Task C1: Business Plan — Costi Operativi

**Files:**
- Create: `docs/business-plan-costi-2026-05-09.md`

- [ ] **Step 1: Ricerca prezzi aggiornati dei servizi**

Verificare i piani attuali su:
- `https://supabase.com/pricing` — Free, Pro ($25/m), Team ($599/m)
- `https://vercel.com/pricing` — Hobby (free), Pro ($20/m)
- `https://resend.com/pricing` — Free (3k email/m), Pro ($20/m + $1/1k)
- `https://expo.dev/pricing` — Free, Production ($29/m)
- `https://sentry.io/pricing/` — Free (5k eventi), Team ($26/m)

- [ ] **Step 2: Creare il documento**

Creare `docs/business-plan-costi-2026-05-09.md`:

```markdown
# CoachLab LMS — Business Plan: Costi Operativi
**Data:** 2026-05-09 | **Autore:** Alessandro Danti

---

## Scenario di utilizzo

CoachLab è una piattaforma LMS (Learning Management System) per la formazione
di allenatori di calcio. I costi operativi dipendono principalmente dal numero
di utenti attivi, dai corsi in gestione e dal volume di storage (file, slides, video).

---

## Fasce di utilizzo

### Fascia 1 — Small (Pilota / Anno 1)
| Parametro | Valore |
|---|---|
| Corsisti attivi | ~50 |
| Corsi simultanei | ~5 |
| Docenti | ~10 |
| Admin | 2 |
| Storage stimato | < 5 GB |
| Email mensili | < 500 |

### Fascia 2 — Medium (Crescita operativa)
| Parametro | Valore |
|---|---|
| Corsisti attivi | ~300 |
| Corsi simultanei | ~30 |
| Docenti | ~60 |
| Admin | 5 |
| Storage stimato | 20–50 GB |
| Email mensili | 3.000–8.000 |

### Fascia 3 — Large (Scala nazionale)
| Parametro | Valore |
|---|---|
| Corsisti attivi | 1.000+ |
| Corsi simultanei | ~100 |
| Docenti | ~200 |
| Admin | 15 |
| Storage stimato | 100–300 GB |
| Email mensili | 15.000–30.000 |

---

## Analisi costi per servizio

### Supabase (Database + Auth + Storage + Realtime)

| Piano | Prezzo | Include |
|---|---|---|
| Free | €0/m | 500 MB DB, 1 GB Storage, 50.000 utenti auth |
| Pro | ~€23/m ($25) | 8 GB DB, 100 GB Storage, utenti illimitati |
| Team | ~€550/m ($599) | 100 GB DB, 200 GB Storage + SLA 99.9% |

**Raccomandazione per fascia:**
- **Small:** Free (sufficiente per pilota < 50 utenti e pochi GB file)
- **Medium:** Pro (~€23/m) — 100 GB Storage è sufficiente per 30 corsi con materiali
- **Large:** Pro + add-on Storage (~€23 + €19 per 100 GB extra) oppure Team se serve SLA

**Nota storage:** i file dell'Archivio Generale (PDF, PPTX) sono il principale driver
di storage. Con 100 corsi e una media di 50 MB/corso → ~5 GB. Con video embedded nei PPTX
il calcolo cambia. Supabase Pro include 100 GB, abbondanti per Medium.

---

### Vercel (Hosting Next.js)

| Piano | Prezzo | Include |
|---|---|---|
| Hobby | €0/m | Deploy illimitati, 100 GB banda, 1 membro team |
| Pro | ~€18/m ($20) | Tutto Hobby + team collaborazione, analytics, protezione |

**Raccomandazione per fascia:**
- **Small:** Hobby (€0) — ok per pilota con traffico limitato
- **Medium:** Pro (~€18/m) — necessario per team e analytics in produzione
- **Large:** Pro (~€18/m) — Next.js è serverless, scala automaticamente

**Nota:** CoachLab è già su Vercel Pro (coachlab.it attivo). Costo attuale: ~€18/m.

---

### Resend (Email transazionale)

| Piano | Prezzo | Include |
|---|---|---|
| Free | €0/m | 3.000 email/m, 1 dominio |
| Pro | ~€18/m ($20) | 50.000 email/m, 10 domini |
| Business | ~€83/m ($90) | 100.000 email/m |

**Raccomandazione per fascia:**
- **Small:** Free (3.000 email/m abbondanti per 50 utenti)
- **Medium:** Pro (~€18/m) — con 300 utenti e email di gruppo, si supera il free
- **Large:** Pro o Business in base al volume di email broadcast

---

### Expo / EAS (App mobile React Native)

| Piano | Prezzo | Include |
|---|---|---|
| Free | €0/m | 30 build/m, OTA unlimited |
| Production | ~€26/m ($29) | Build prioritarie, 200 build/m |

**Raccomandazione per fascia:**
- **Small/Medium:** Free (30 build/m sufficienti per aggiornamenti periodici)
- **Large:** Production (~€26/m) se gli aggiornamenti diventano frequenti

---

### Sentry (Error monitoring)

| Piano | Prezzo | Include |
|---|---|---|
| Free | €0/m | 5.000 eventi/m, 1 membro |
| Team | ~€24/m ($26) | 50.000 eventi/m, team illimitati |

**Raccomandazione per fascia:**
- **Small:** Free
- **Medium/Large:** Team (~€24/m) per monitoraggio produzione serio

---

### Dominio

| Voce | Costo |
|---|---|
| coachlab.it | ~€15/anno (~€1.25/m) |

---

## Riepilogo costi mensili per fascia

| Servizio | Small | Medium | Large |
|---|---|---|---|
| Supabase | €0 | €23 | €23–€42* |
| Vercel | €0 | €18 | €18 |
| Resend | €0 | €18 | €18–€83 |
| Expo/EAS | €0 | €0 | €26 |
| Sentry | €0 | €24 | €24 |
| Dominio | €1 | €1 | €1 |
| **TOTALE** | **~€1/m** | **~€84/m** | **~€110–€194/m** |

*Supabase Large: Pro con add-on storage se > 100 GB

> **Nota:** I costi Large rimangono contenuti grazie all'architettura serverless di Vercel
> e alla scalabilità automatica di Supabase. Non ci sono costi fissi per server dedicati.

---

## Costi una tantum (setup)

| Voce | Stima |
|---|---|
| Registrazione dominio coachlab.it | ~€15 (già pagato) |
| Certificato SSL | €0 (incluso Vercel) |
| Setup iniziale infrastruttura | 0 (già operativo) |

---

## Ipotesi di pricing per il cliente

Modello suggerito: **licenza annuale per ente** con fasce basate sul numero di corsisti.

| Fascia | Corsisti | Prezzo annuale suggerito | Margine stimato |
|---|---|---|---|
| Starter | fino a 50 | €1.500/anno | ~€1.488 (costi: ~€12) |
| Growth | fino a 300 | €6.000/anno | ~€4.992 (costi: ~€1.008) |
| Enterprise | 300+ | €15.000+/anno | ~€12.672+ (costi: ~€2.328) |

> Nota: il margine è molto alto perché i costi infrastrutturali rimangono bassi.
> Il principale costo di sviluppo è il lavoro di sviluppo (una tantum, già sostenuto).

---

## Conclusioni

CoachLab è un prodotto con **bassissimi costi operativi** e **alta marginalità**.
L'architettura cloud-native (Vercel + Supabase) elimina i costi di gestione server
e scala automaticamente con la crescita degli utenti.

Il costo per passare da pilota (€1/m) a operatività completa (€84/m) è incrementale
e direttamente proporzionale alla crescita del business.
```

- [ ] **Step 3: Commit**

```bash
cd ~/figc-lms && git add docs/business-plan-costi-2026-05-09.md
git commit -m "docs: business plan costi operativi 3 fasce"
```

---

## Task C2: Pitch Deck — 12 slide PowerPoint

**Files:**
- Output: `docs/CoachLab-PitchDeck-2026-05.pptx`

Usare il MCP PowerPoint (`mcp__PowerPoint__By_Anthropic___*`) per creare la presentazione.

- [ ] **Step 1: Creare la presentazione**

```
mcp__PowerPoint__By_Anthropic___create_presentation
  title: "CoachLab LMS — Pitch Deck"
  author: "Alessandro Danti"
```

- [ ] **Step 2: Slide 1 — Cover**

```
mcp__PowerPoint__By_Anthropic___set_slide_title
  slide_index: 0
  title: "CoachLab"

mcp__PowerPoint__By_Anthropic___add_text_to_slide
  slide_index: 0
  text: "La formazione degli allenatori, finalmente digitale.\n\nMaggio 2026"
  position: center
```

- [ ] **Step 3: Slide 2 — Il problema**

```
mcp__PowerPoint__By_Anthropic___add_slide
  title: "Il problema di oggi"

mcp__PowerPoint__By_Anthropic___add_text_to_slide
  slide_index: 1
  text: |
    Gestire un corso di formazione sportiva significa:

    ⏱ Ore perse ogni settimana su fogli Excel per presenze e valutazioni
    📧 Email disperse per distribuire materiali e comunicare con i corsisti
    📋 Nessuna traccia digitale dei progressi, degli esami, delle assenze
    🗂 Programmi e orari creati da zero per ogni corso, senza template

    Il risultato: inefficienza, errori, e un'esperienza formativa mediocre.
```

- [ ] **Step 4: Slide 3 — La soluzione**

```
mcp__PowerPoint__By_Anthropic___add_slide
  title: "Con CoachLab: tutto in un posto"

mcp__PowerPoint__By_Anthropic___add_text_to_slide
  slide_index: 2
  text: |
    CoachLab è un LMS completo pensato per gli enti di formazione sportiva.

    ✅ 4 ruoli distinti: Super Admin · Admin · Docente · Corsista
    ✅ Ogni ruolo vede solo quello che serve — nessuna confusione
    ✅ Web app completa + App mobile nativa (iOS & Android)
    ✅ Già in produzione su coachlab.it — testato con corsi reali
    ✅ GDPR compliant — DPA firmati con Supabase, Vercel, Resend
```

- [ ] **Step 5: Slide 4 — Per l'ente (super admin/admin)**

```
mcp__PowerPoint__By_Anthropic___add_slide
  title: "Per chi gestisce i corsi"

mcp__PowerPoint__By_Anthropic___add_text_to_slide
  slide_index: 3
  text: |
    Da ore a minuti.

    🎓 Crea un corso in 3 click partendo da un template pre-impostato
    📅 Il calendario del corso si genera automaticamente con le fasce orarie
    👨‍🏫 Assegna docenti per area di competenza — il sistema li suggerisce
    📊 Dashboard con tutti i corsi attivi, filtrabili per regione e tipologia
    🔗 Comunicato Ufficiale (CU) collegato direttamente al documento ufficiale
    👥 Gestione multi-admin con permessi configurabili per ogni utente
```

- [ ] **Step 6: Slide 5 — Per il docente**

```
mcp__PowerPoint__By_Anthropic___add_slide
  title: "Per il docente"

mcp__PowerPoint__By_Anthropic___add_text_to_slide
  slide_index: 4
  text: |
    Il tuo corso, sempre aggiornato.

    📋 Programma del corso con fasce orarie — export PDF con copertina e anteprima
    ✅ Presenze: registra in un click, il sistema calcola automaticamente le %
    📁 Archivio materiali per area disciplinare — condividi con un click
    📝 Esami e prove intermedie con correzione e valutazione integrata
    💬 Messaggi diretti ai corsisti, annunci, notifiche push
    📅 Il tuo calendario personale con le lezioni assegnate
```

- [ ] **Step 7: Slide 6 — Per il corsista**

```
mcp__PowerPoint__By_Anthropic___add_slide
  title: "Per il corsista"

mcp__PowerPoint__By_Anthropic___add_text_to_slide
  slide_index: 5
  text: |
    Tutto il corso nel telefono. Nessuna email persa.

    📱 App mobile nativa (iOS & Android) — sempre aggiornata in tempo reale
    🗓 Programma completo del corso con orari e materie
    📊 Le proprie presenze con percentuali — sempre visibili
    📚 Tutti i materiali del corso scaricabili in un posto solo
    📝 Esami e task da completare con scadenze chiare
    🔔 Notifiche push per annunci, nuovi materiali, promemoria
```

- [ ] **Step 8: Slide 7 — Tracciabilità**

```
mcp__PowerPoint__By_Anthropic___add_slide
  title: "Tracciabilità completa"

mcp__PowerPoint__By_Anthropic___add_text_to_slide
  slide_index: 6
  text: |
    Ogni dato, sempre disponibile.

    ✅ Registro presenze digitale per ogni sessione — con data, docente, corsista
    📊 Report presenze per corso e per corsista — export CSV
    🏆 Valutazioni: pratica ADP + prove aperte + voti — storico completo
    📋 Idoneità automatica basata su % presenze e superamento esami
    📁 Archivio documenti centralizzato per area disciplinare
    🔒 Tutti i dati su cloud sicuro (Supabase/PostgreSQL) — backup automatico
```

- [ ] **Step 9: Slide 8 — Scalabilità e costi**

```
mcp__PowerPoint__By_Anthropic___add_slide
  title: "Scalabile e sostenibile"

mcp__PowerPoint__By_Anthropic___add_text_to_slide
  slide_index: 7
  text: |
    Costi operativi prevedibili a qualsiasi scala.

    Fascia Pilota (50 corsisti, 5 corsi):   ~€1/mese
    Fascia Operativa (300 corsisti, 30 corsi):   ~€84/mese
    Fascia Nazionale (1.000+ corsisti, 100 corsi):   ~€110–194/mese

    Infrastruttura cloud-native (Vercel + Supabase):
    • Nessun server dedicato da gestire
    • Scala automaticamente con la crescita
    • Costo per corsista attivo a scala nazionale: < €0.20/mese
```

- [ ] **Step 10: Slide 9 — Già live**

```
mcp__PowerPoint__By_Anthropic___add_slide
  title: "Già in produzione"

mcp__PowerPoint__By_Anthropic___add_text_to_slide
  slide_index: 8
  text: |
    CoachLab è operativo su coachlab.it da aprile 2026.

    Cosa è già live oggi:
    ✅ Gestione completa corsi (presenze, quiz, task, valutazioni, programma)
    ✅ Messaggistica interna 1:1 e broadcast
    ✅ Registrazione corsisti via link invito con QR code
    ✅ App mobile iOS & Android (Expo / EAS)
    ✅ Notifiche push native
    ✅ Export PDF programma corso
    ✅ Guide interattive in-app per ogni ruolo
    ✅ Infrastruttura legale GDPR (Privacy, Termini, DPA)
    ✅ Sentry monitoring — crash reporting attivo
```

- [ ] **Step 11: Slide 10 — Roadmap**

```
mcp__PowerPoint__By_Anthropic___add_slide
  title: "Roadmap — prossimi 30 giorni"

mcp__PowerPoint__By_Anthropic___add_text_to_slide
  slide_index: 9
  text: |
    In sviluppo adesso:

    🗂 Archivio Generale per aree disciplinari
       File e slides condivisibili tra corsi, filtrabili per materia

    📋 Template corsi con calendario integrato
       Struttura oraria pre-impostata, materie, docenti suggeriti per area

    👤 Ruolo Admin configurabile
       Permessi granulari per ogni admin, gestibili dal super admin

    📅 Calendari aggregati
       Vista settimanale di tutti i corsi e docenti, con filtri

    🎨 Navigazione rinnovata
       Sidebar Notion-style per una UX più fluida e intuitiva
```

- [ ] **Step 12: Slide 11 — Prossimi passi**

```
mcp__PowerPoint__By_Anthropic___add_slide
  title: "Prossimi passi"

mcp__PowerPoint__By_Anthropic___add_text_to_slide
  slide_index: 10
  text: |
    Come procedere insieme.

    1. Demo live guidata (30 min)
       Navigazione completa della piattaforma per ruolo,
       con i vostri casi d'uso specifici

    2. Accordo pilota
       Attivazione su un corso reale, supporto dedicato,
       raccolta feedback per iterare rapidamente

    3. Accordo di licenza
       Licenza annuale per ente — scalabile al crescere
       del numero di corsi e corsisti

    Siamo pronti a partire subito.
```

- [ ] **Step 13: Slide 12 — Q&A**

```
mcp__PowerPoint__By_Anthropic___add_slide
  title: "Domande?"

mcp__PowerPoint__By_Anthropic___add_text_to_slide
  slide_index: 11
  text: |
    CoachLab LMS
    coachlab.it

    Alessandro Danti
    info.alessandrodanti@gmail.com
```

- [ ] **Step 14: Salvare il file**

```
mcp__PowerPoint__By_Anthropic___save_presentation
  file_path: "/Users/alessandrodanti/figc-lms/docs/CoachLab-PitchDeck-2026-05.pptx"
```

- [ ] **Step 15: Commit**

```bash
cd ~/figc-lms && git add docs/CoachLab-PitchDeck-2026-05.pptx
git commit -m "docs: pitch deck 12 slide per presentazione 15 maggio 2026"
```

---

## Task C3: Script Demo Live

**Files:**
- Create: `docs/script-demo-live-2026-05-09.md`

- [ ] **Step 1: Creare lo script**

Creare `docs/script-demo-live-2026-05-09.md`:

```markdown
# CoachLab — Script Demo Live
**Durata:** 12–15 minuti | **URL:** coachlab.it | **Data:** 15 maggio 2026

---

## Setup pre-demo (fare prima della presentazione)

1. Aprire tre finestre/tab del browser:
   - Tab 1: super_admin (`admin@figclms.it` / `Figc2024!`)
   - Tab 2: docente (`alessandronista@libero.it` / `Figc2024!`)
   - Tab 3: studente (`marco.verdi.test2026@yopmail.com` / `TestCoach2026!`)
2. Assicurarsi che `localhost:3001` sia attivo (oppure usare `coachlab.it`)
3. Avere il pitch deck aperto su schermo secondario

---

## Percorso demo

### Parte 1 — Super Admin (3 min)
**Messaggio:** "Chi gestisce la piattaforma ha il controllo totale."

1. **Dashboard:** mostrare la lista corsi attivi con filtri regione/tipo e colonna CU linkato
2. **Crea corso da template:** click su "Template corsi" → seleziona "UEFA A Standard" → mostrare il form pre-compilato (materie, durata, calendario)
3. **Calendari:** aprire la sezione Calendari → mostrare la vista settimanale aggregata
4. **Utenti:** aprire "Admin" → mostrare la pagina permessi di un admin

---

### Parte 2 — Docente (4 min)
**Messaggio:** "Il docente ha tutto quello che serve per gestire il suo corso."

1. **Dashboard:** mostrare i widget con testo esplicativo
2. **Sidebar:** mostrare la navigazione Notion-style → aprire "I miei corsi" → cliccare su un corso
3. **Presenze:** aprire Presenze → mostrare la registrazione veloce
4. **Programma:** aprire Programma → mostrare le fasce orarie → click "Anteprima PDF" → mostrare il modal con la copertina
5. **Archivio File:** aprire Archivio → caricare un file demo → abilitarlo/disabilitarlo per gli studenti

---

### Parte 3 — Studente (mobile se possibile, altrimenti web) (3 min)
**Messaggio:** "Il corsista ha tutto nel telefono. È semplice come un'app."

1. **Dashboard mobile:** mostrare il widget "Prossima sessione"
2. **Corso:** aprire un corso → Programma → Presenze (% aggiornata)
3. **Archivio File:** mostrare i file scaricabili abilitati dal docente
4. **Esame:** aprire "Esami e Prove Intermedie" → mostrare un esame completato

---

### Parte 4 — Report e chiusura (2 min)
**Messaggio:** "Tutto è tracciato e disponibile."

1. Tornare al super_admin
2. **Report presenze:** aprire il report di un corso → mostrare export CSV
3. **PDF Programma:** mostrare il PDF generato con copertina e grafica migliorata

---

## Domande frequenti da anticipare

**"Quanto costa attivarlo?"**
→ Costi infrastruttura da €1/m (pilota) a €84/m (crescita operativa). Licenza annuale per ente.

**"È già usato da qualcuno?"**
→ Ambiente di test con dati reali operativo. Pronto per accordo pilota su un corso vero.

**"Si può personalizzare con il nostro brand?"**
→ Logo, colori e nome modificabili. La struttura è già white-label ready.

**"Gestisce le certificazioni/attestati?"**
→ Report idoneità generato automaticamente. Attestati personalizzabili nella roadmap.

**"È sicuro? Dove sono i dati?"**
→ Dati su Supabase (PostgreSQL in Europa), GDPR compliant, DPA firmati con tutti i fornitori.

**"Funziona offline?"**
→ La web app richiede connessione. L'app mobile mostra i dati in cache offline (visualizzazione).
```

- [ ] **Step 2: Commit**

```bash
git add docs/script-demo-live-2026-05-09.md
git commit -m "docs: script demo live 15 min per presentazione"
```

---

## Task C4: Self-review finale documenti

- [ ] **Step 1: Leggere business plan e verificare i numeri**

Rileggere `docs/business-plan-costi-2026-05-09.md` e verificare:
- I prezzi dei servizi sono aggiornati (confrontare con i siti ufficiali se necessario)
- I totali mensili per fascia sono corretti
- Le ipotesi di pricing per il cliente sono ragionevoli

- [ ] **Step 2: Verificare il pitch deck**

Aprire `docs/CoachLab-PitchDeck-2026-05.pptx` e verificare:
- Tutte le 12 slide sono presenti
- Il contenuto è leggibile e benefit-first
- Nessun placeholder o testo incompleto

- [ ] **Step 3: Verificare lo script demo**

Rileggere lo script e verificare:
- Il percorso è fattibile con le feature sviluppate in Stream A e B
- I tempi per parte sono realistici
- Le FAQ coprono le domande più probabili

- [ ] **Step 4: Commit finale**

```bash
git add docs/
git commit -m "docs: revisione finale business docs — business plan, pitch deck, script demo"
```
