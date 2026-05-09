# CoachLab — Script Demo Live
**Durata:** 12–15 minuti | **URL:** coachlab.it | **Data:** 15 maggio 2026

---

## Setup pre-demo (fare prima della presentazione)

1. Aprire tre finestre/tab del browser:
   - Tab 1: super_admin (`admin@figclms.it` / `Figc2024!`)
   - Tab 2: docente (`alessandronista@libero.it` / `Figc2024!`)
   - Tab 3: studente (`marco.verdi.test2026@yopmail.com` / `TestCoach2026!`)
2. Assicurarsi che `coachlab.it` sia raggiungibile
3. Avere il pitch deck aperto su schermo secondario
4. Se si usa la demo locale: `cd /Users/alessandrodanti/figc-lms && npm run dev` → localhost:3000

---

## Percorso demo

### Parte 1 — Super Admin (3 min)
**Messaggio:** "Chi gestisce la piattaforma ha il controllo totale."

1. **Dashboard:** mostrare la lista corsi attivi con filtri regione/tipo e colonna CU linkato al documento ufficiale
2. **Template corsi:** click su "Template corsi" nella sidebar → mostrare lista con "UEFA A Standard" → click "Nuovo template" → mostrare il form con materie e fasce orarie
3. **Calendari:** aprire sezione "Calendari" → mostrare la griglia settimanale aggregata con navigazione settimana precedente/successiva
4. **Gestione utenti:** aprire un utente admin → click "Gestisci permessi" → mostrare i toggle granulari per ogni permesso
5. **Archivio Generale:** aprire "Archivio Generale" → mostrare filtri per area disciplinare e tipo file

---

### Parte 2 — Docente (4 min)
**Messaggio:** "Il docente ha tutto quello che serve per gestire il suo corso."

1. **Dashboard:** mostrare i widget con KPI: corsi attivi, studenti, task in attesa, prossima lezione
2. **Sidebar Notion-style:** mostrare la navigazione con sezioni espandibili → aprire "I miei corsi" → cliccare su un corso
3. **Presenze:** aprire Presenze → mostrare la registrazione presenza per sessione con % aggiornate in tempo reale
4. **Programma + PDF:** aprire Programma → mostrare le fasce orarie → click "Anteprima PDF" → mostrare il modal con copertina CoachLab (location, date) e grafica fasce orarie
5. **Archivio File corso:** aprire "Archivio" nel corso → caricare un file demo PDF → usare il toggle per abilitarlo/disabilitarlo per gli studenti
6. **Esami:** aprire "Esami e Prove Intermedie" → mostrare la lista esami con risultati corretti per studente

---

### Parte 3 — Studente (mobile se possibile, altrimenti web) (3 min)
**Messaggio:** "Il corsista ha tutto nel telefono. È semplice come un'app."

1. **Banner prossima lezione:** mostrare il banner in dashboard con data, orario e luogo del prossimo appuntamento
2. **Dashboard widget:** mostrare le 4 stats card (corsi, presenze %, quiz completati, task aperti)
3. **Corso → Archivio File:** aprire il file abilitato dal docente → click Scarica
4. **Esami e Prove Intermedie:** mostrare la lista esami disponibili e i risultati di uno completato
5. **App mobile (opzionale):** se disponibile smartphone, mostrare la stessa navigazione da app nativa

---

### Parte 4 — Report e chiusura (2 min)
**Messaggio:** "Tutto è tracciato e sempre disponibile."

1. Tornare al super_admin
2. **Report presenze:** aprire il report di un corso → mostrare la tabella con % per corsista → mostrare il bottone export CSV
3. **PDF Programma completo:** mostrare il PDF generato con copertina navy/teal, location, date range e grafica fasce orarie

---

## Punti da enfatizzare in ogni parte

| Momento | Frase chiave |
|---|---|
| Apertura | "Tutto quello che vi mostro è già in produzione su coachlab.it" |
| Super Admin | "Da tre click si crea un corso partendo da un template pre-impostato" |
| Docente | "Il PDF del programma si genera in un secondo, con copertina e grafica professionale" |
| Studente | "Il corsista non deve cercare niente: arriva tutto via notifica push" |
| Chiusura | "Costo operativo: meno di €100 al mese per 300 corsisti attivi" |

---

## Domande frequenti da anticipare

**"Quanto costa attivarlo?"**
→ Costi infrastruttura da €1/m (pilota) a €84/m (crescita operativa). Licenza annuale per ente da €1.500 (Starter) a €15.000+ (Enterprise).

**"È già usato da qualcuno?"**
→ Ambiente di test con dati reali operativo da aprile 2026. Pronto per accordo pilota su un corso vero entro giugno 2026.

**"Si può personalizzare con il nostro brand?"**
→ Logo, colori e nome modificabili. La struttura è già white-label ready.

**"Gestisce le certificazioni/attestati?"**
→ Report idoneità generato automaticamente basato su % presenze e superamento esami. Attestati PDF personalizzabili nella roadmap prossimi 60 giorni.

**"È sicuro? Dove sono i dati?"**
→ Dati su Supabase (PostgreSQL in Europa/Frankfurt), GDPR compliant, DPA firmati con tutti i fornitori (Supabase, Vercel, Resend). Privacy Policy e Termini live su coachlab.it.

**"Funziona offline?"**
→ La web app richiede connessione. L'app mobile mostra i dati in cache offline (visualizzazione). Sincronizzazione automatica al ripristino connessione.

**"Si integra con i nostri sistemi esistenti?"**
→ Export CSV dei dati. API REST disponibile. Integrazioni specifiche valutabili caso per caso.

---

## Backup — se qualcosa non funziona

- Se la connessione è lenta: usare `localhost:3000` con il server locale
- Se un account non funziona: usare account super_admin per tutte le dimostrazioni
- Se il PDF non genera: mostrare l'anteprima screenshot preparata in anticipo
- Se l'app mobile non è disponibile: mostrare la versione web mobile (responsive)
