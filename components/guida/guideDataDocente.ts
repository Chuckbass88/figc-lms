import type { GuideSection } from './guideDataStudente'

export { GuideSection }

export const DOCENTE_QUICK_ACTIONS = [
  { label: '📚 Gestire i miei corsi',        sectionId: 'corsi' },
  { label: '📁 Aggiungere materiali',         sectionId: 'materiali' },
  { label: '📝 Creare un quiz',               sectionId: 'quiz' },
  { label: '✅ Valutare i task',              sectionId: 'task' },
  { label: '📋 Registrare le presenze',       sectionId: 'presenze' },
  { label: '💬 Scrivere agli studenti',       sectionId: 'messaggi' },
  { label: '📢 Inviare un annuncio',          sectionId: 'annunci' },
]

export const DOCENTE_SECTIONS: GuideSection[] = [
  {
    id: 'accesso',
    icon: '🔐',
    title: 'Come accedere alla piattaforma',
    description: 'Come fare il login con il tuo account docente.',
    tags: ['login', 'accesso', 'password', 'email', 'entrare'],
    steps: [
      {
        title: 'Apri il browser e vai alla piattaforma',
        text: "Apri Chrome, Safari, Firefox o Edge. Nella barra degli indirizzi in alto scrivi l'indirizzo della piattaforma (fornito dall'amministratore) e premi Invio.",
        tip: "Aggiungi l'indirizzo ai segnalibri per trovarlo subito la prossima volta.",
      },
      {
        title: 'Inserisci le tue credenziali',
        text: "Nella pagina di login inserisci:\n• Email: il tuo indirizzo email docente\n• Password: la password che ti è stata assegnata\n\nClicca il pulsante 'Accedi' per entrare.",
        tip: "Clicca l'icona 👁 accanto al campo password per vedere cosa stai digitando.",
        warning: "Se non ricordi la password, clicca 'Hai dimenticato la password?' e segui le istruzioni via email.",
      },
      {
        title: 'La tua dashboard docente',
        text: "Dopo il login arrivi alla tua dashboard docente. Qui trovi:\n• Il saluto con il tuo nome\n• Azioni rapide (Presenze, Valuta Task, ecc.)\n• Riepilogo dei tuoi corsi attivi\n• Statistiche studenti e task da valutare",
        screenshot: '/guide/d-dashboard.jpg',
      },
    ],
  },
  {
    id: 'dashboard',
    icon: '🏠',
    title: 'La tua dashboard docente',
    description: 'Come orientarti nella piattaforma e usare le azioni rapide.',
    tags: ['home', 'dashboard', 'menu', 'navigare', 'azioni rapide'],
    steps: [
      {
        title: 'Il menu a sinistra',
        text: "Sul lato sinistro trovi il menu con tutte le sezioni:\n• Dashboard → pagina principale\n• I Miei Corsi → gestisci i tuoi corsi\n• Le Mie Task → task degli studenti da valutare\n• Libreria Quiz → crea e gestisci i quiz\n• Archivio Documenti → libreria file\n• Calendario → sessioni e scadenze\n• Corsisti → lista studenti\n• Report Idoneità → presenze e statistiche\n• Messaggi → chat con studenti\n• Notifiche → annunci e avvisi",
        screenshot: '/guide/d-dashboard.jpg',
      },
      {
        title: 'Azioni rapide nella dashboard',
        text: "In alto nella dashboard trovi i pulsanti delle azioni rapide:\n• Presenze → vai subito al registro presenze del corso attivo\n• Valuta Task → apri i task in attesa di valutazione\n• Annunci → invia una notifica a tutti i tuoi studenti\n• I miei corsi → vai alla lista corsi\n\nSono scorciatoie per le attività che fai più spesso.",
        tip: "Questi pulsanti cambiano in base alla situazione: 'Valuta Task' mostra un badge col numero di task in attesa.",
      },
      {
        title: 'I widget del dashboard',
        text: "Al centro della dashboard trovi i widget informativi:\n• Numero corsi attivi\n• Numero totale studenti\n• Task in attesa di valutazione\n• Attività recente\n\nSono aggiornati in tempo reale.",
      },
    ],
  },
  {
    id: 'corsi',
    icon: '📚',
    title: 'Gestire i tuoi corsi',
    description: 'Come navigare, visualizzare e gestire i corsi di cui sei docente.',
    tags: ['corsi', 'lezioni', 'studenti', 'gestire', 'corso'],
    steps: [
      {
        title: 'Apri la sezione Corsi',
        text: "Nel menu a sinistra clicca su 'I Miei Corsi'. Vedrai la lista di tutti i corsi che insegni, con nome, numero di studenti iscritti e stato del corso.",
        screenshot: '/guide/d-corsi.jpg',
      },
      {
        title: 'Apri un corso',
        text: "Clicca su un corso per aprirlo. Dentro un corso trovi diverse schede:\n• Panoramica → info generali e statistiche\n• Lezioni → gestione dei contenuti\n• Studenti → lista degli iscritti\n• Materiali → file e documenti\n• Quiz → test di verifica\n• Task → compiti da valutare\n• Sessioni → gestione presenze\n• Archivio → documenti collegati",
        screenshot: '/guide/d-corso-dettaglio.jpg',
      },
      {
        title: 'Vedere la lista studenti',
        text: "Clicca sulla scheda 'Studenti' dentro un corso. Vedrai tutti gli studenti iscritti con nome, stato e progressi. Puoi cliccare su un nome per vedere il dettaglio del singolo studente.",
        screenshot: '/guide/d-corsisti.jpg',
      },
      {
        title: 'Controllare i progressi',
        text: "Nella scheda 'Studenti' o 'Panoramica' puoi vedere i progressi degli studenti: lezioni completate, quiz superati, task consegnati. Usa questi dati per capire chi ha bisogno di supporto.",
        tip: "Uno studente con bassa percentuale di completamento potrebbe aver bisogno di un incoraggiamento tramite messaggio.",
      },
    ],
  },
  {
    id: 'materiali',
    icon: '📁',
    title: 'Aggiungere materiali al corso',
    description: 'Come caricare file, PDF, video e documenti per i tuoi studenti.',
    tags: ['materiali', 'pdf', 'file', 'caricare', 'upload', 'allegare', 'documenti'],
    steps: [
      {
        title: 'Apri la scheda Materiali',
        text: "Apri un corso e clicca sulla scheda 'Materiali'. Vedrai l'elenco dei materiali già caricati (se presenti).",
      },
      {
        title: 'Carica un nuovo materiale',
        text: "Clicca il pulsante 'Aggiungi materiale' o l'area tratteggiata con l'icona di upload (freccia verso l'alto). Si aprirà la finestra per scegliere il file.",
      },
      {
        title: 'Seleziona il file',
        text: "Si apre la finestra del tuo computer. Naviga fino alla cartella dove hai salvato il file, cliccaci sopra per selezionarlo, poi clicca 'Apri'. Il file inizierà il caricamento.",
        tip: "Puoi anche trascinare il file direttamente sull'area di upload (drag & drop).",
        warning: "La dimensione massima per file è di solito 50 MB. Per video grandi usa un link YouTube/Vimeo invece di caricare il file.",
      },
      {
        title: 'Aspetta il caricamento',
        text: "Vedrai una barra di avanzamento (progress bar) che mostra il progresso del caricamento. Attendi che raggiunga il 100%. Non chiudere la pagina durante il caricamento!",
      },
      {
        title: 'Il materiale è disponibile',
        text: "Quando il caricamento è completo, il file appare nell'elenco dei materiali. Tutti gli studenti del corso possono vederlo e scaricarlo immediatamente.",
        tip: "Puoi caricare qualsiasi tipo di file: PDF, Word, Excel, PowerPoint, immagini, zip.",
      },
      {
        title: "L'archivio documenti",
        text: "Hai anche accesso a 'Archivio Documenti' nel menu. Qui puoi gestire una libreria centrale di documenti riutilizzabili in più corsi: template, moduli, materiali di riferimento.",
      },
    ],
  },
  {
    id: 'quiz',
    icon: '📝',
    title: 'Creare e gestire i quiz',
    description: 'Come creare test di verifica e attivarli nei tuoi corsi.',
    tags: ['quiz', 'test', 'domande', 'creare', 'attivare', 'punteggio'],
    steps: [
      {
        title: 'Apri la Libreria Quiz',
        text: "Nel menu a sinistra clicca su 'Libreria Quiz'. Vedrai due schede: 'Quiz' (i tuoi quiz già creati) e 'Domande' (la libreria di domande singole).",
        screenshot: '/guide/d-quiz-libreria.jpg',
      },
      {
        title: 'Crea un nuovo quiz',
        text: "Clicca il pulsante '+' o 'Nuovo Quiz'. Inserisci:\n• Titolo del quiz (es. 'Verifica Modulo 1')\n• Descrizione (facoltativa)\n• Categoria\n\nClicca 'Salva' per creare il quiz.",
      },
      {
        title: 'Aggiungi le domande',
        text: "Dopo aver creato il quiz, clicca 'Aggiungi domanda'. Per ogni domanda:\n1. Scrivi il testo della domanda\n2. Inserisci le opzioni di risposta (di solito 4)\n3. Clicca il cerchio accanto alla risposta corretta per segnarla\n4. Clicca 'Salva domanda'\n\nRipeti per ogni domanda.",
        tip: "Puoi importare domande dalla Libreria Domande invece di crearle da zero.",
      },
      {
        title: 'Configura il quiz',
        text: "Per ogni quiz puoi impostare:\n• Punteggio minimo per superare il test\n• Tempo massimo (in minuti)\n• Numero di tentativi consentiti\n• Ordine domande casuale\n• Data di inizio e fine disponibilità",
      },
      {
        title: 'Attiva il quiz in un corso',
        text: "Quando il quiz è pronto, clicca 'Attiva nel corso'. Si aprirà una finestra:\n1. Seleziona il corso da un menu a tendina\n2. (Opzionale) Imposta una data e ora di inizio\n3. Clicca 'Attiva'\n\nGli studenti del corso vedranno il quiz subito (o dalla data impostata).",
        tip: "Se non imposti una data di inizio, il quiz è disponibile subito dopo l'attivazione.",
      },
      {
        title: 'Vedi i risultati degli studenti',
        text: "Dopo che gli studenti hanno fatto il quiz, puoi vedere i risultati andando nel corso → scheda Quiz → clicca il quiz → 'Risultati'. Vedi tutti i punteggi, le risposte date e le statistiche.",
      },
    ],
  },
  {
    id: 'task',
    icon: '✅',
    title: 'Valutare i task (compiti)',
    description: 'Come vedere i compiti consegnati dagli studenti e assegnare una valutazione.',
    tags: ['task', 'compito', 'valutare', 'voto', 'correggere', 'feedback'],
    steps: [
      {
        title: 'Accedi ai task',
        text: "Nel menu a sinistra clicca su 'Le Mie Task'. Vedrai tutti i task di tutti i tuoi corsi, con filtri per stato: 'Da valutare', 'Valutati', 'Scaduti'.",
        tip: "Il badge nella dashboard mostra quanti task sono in attesa di valutazione.",
        screenshot: '/guide/d-task.jpg',
      },
      {
        title: 'Apri un task da valutare',
        text: "Clicca su un task con lo stato 'Consegnato' o 'Da valutare'. Vedrai il nome dello studente, la data di consegna e il file allegato.",
      },
      {
        title: 'Visualizza il lavoro dello studente',
        text: "Clicca sul nome del file allegato per aprirlo o scaricarlo. Leggi/guarda attentamente il lavoro consegnato prima di assegnare una valutazione.",
      },
      {
        title: 'Inserisci la valutazione',
        text: "Nel campo 'Voto' inserisci il punteggio (es. 85 su 100, o 7/10, secondo il sistema configurato). Nel campo 'Feedback' puoi scrivere un commento personalizzato per lo studente.",
        tip: "Un feedback dettagliato aiuta molto lo studente a capire cosa ha sbagliato e cosa ha fatto bene.",
      },
      {
        title: 'Salva la valutazione',
        text: "Clicca 'Salva valutazione'. Lo studente riceverà automaticamente una notifica con il voto e il tuo commento.",
      },
    ],
  },
  {
    id: 'presenze',
    icon: '📋',
    title: 'Registrare le presenze',
    description: 'Come fare il registro presenze per le sessioni del corso.',
    tags: ['presenze', 'registro', 'assenza', 'presenza', 'sessione', 'appello'],
    steps: [
      {
        title: 'Accedi al registro presenze',
        text: "Ci sono due modi:\n• Dashboard → clicca 'Presenze' nelle azioni rapide\n• Apri un corso → scheda 'Sessioni'\n\nEntrambi portano al registro presenze.",
      },
      {
        title: 'Seleziona o crea una sessione',
        text: "Vedrai l'elenco delle sessioni (lezioni in presenza o online). Clicca su una sessione per aprire il registro, oppure clicca 'Nuova sessione' per aggiungere una lezione.",
      },
      {
        title: 'Fai l\'appello',
        text: "Per ogni studente nella lista, clicca sul simbolo accanto al nome per segnare:\n• ✓ Verde → Presente\n• ✗ Rosso → Assente\n• ⏰ Giallo → In ritardo\n\nPuoi cliccare più volte per cambiare stato.",
        tip: "Clicca 'Segna tutti presenti' per velocizzare se quasi tutti sono presenti, poi correggi le eccezioni.",
      },
      {
        title: 'Salva le presenze',
        text: "Dopo aver segnato tutti gli studenti, clicca il pulsante 'Salva presenze'. Le presenze vengono registrate e gli studenti possono vederle nel loro profilo.",
      },
      {
        title: 'Vedere i report presenze',
        text: "Nel menu clicca 'Report Idoneità' per vedere un riepilogo completo: percentuale presenze per studente, studenti sotto soglia, statistiche per corso.",
        warning: "Studenti con presenze insufficienti appaiono evidenziati in rosso nel report. Contattali tramite messaggi per avvisarli.",
        screenshot: '/guide/d-report.jpg',
      },
    ],
  },
  {
    id: 'messaggi',
    icon: '💬',
    title: 'Messaggi e comunicazione',
    description: 'Come comunicare con gli studenti individualmente o in gruppo.',
    tags: ['messaggi', 'chat', 'comunicare', 'scrivere', 'gruppo', 'broadcast'],
    steps: [
      {
        title: 'Apri la sezione Messaggi',
        text: "Nel menu a sinistra clicca su 'Messaggi'. A sinistra trovi le conversazioni esistenti, a destra i messaggi della conversazione selezionata.",
        screenshot: '/guide/d-messaggi.jpg',
      },
      {
        title: 'Scrivi a uno studente (messaggio diretto)',
        text: "Clicca il pulsante '+' in alto nel pannello messaggi. Nella finestra che si apre, cerca il nome dello studente nel campo di ricerca. Clicca sul nome, scrivi il messaggio e clicca 'Invia messaggio'.",
      },
      {
        title: 'Scrivi a tutto il corso (messaggio di gruppo)',
        text: "Clicca il pulsante '+' e poi la scheda 'Gruppo corso'. Seleziona il corso dalla lista. Scrivi il messaggio che vuoi inviare a tutti gli studenti iscritti. Clicca 'Invia al gruppo'.\n\nIl messaggio arriva a tutti gli studenti del corso contemporaneamente.",
        tip: "Usa i messaggi di gruppo per comunicare scadenze, cambi di orario o annunci importanti.",
      },
      {
        title: 'Rispondere ai messaggi',
        text: "Quando uno studente ti scrive, ricevi una notifica. Clicca sulla conversazione nella lista a sinistra e scrivi la tua risposta in basso. Premi → o Cmd+Invio per inviare.",
      },
    ],
  },
  {
    id: 'annunci',
    icon: '📢',
    title: 'Inviare annunci e notifiche',
    description: 'Come inviare comunicazioni importanti a tutti i tuoi studenti.',
    tags: ['annunci', 'notifiche', 'comunicare', 'avviso', 'broadcast', 'inviare'],
    steps: [
      {
        title: 'Apri la sezione Notifiche',
        text: "Nel menu a sinistra clicca su 'Notifiche'. Vedrai due schede: 'Le mie notifiche' (quelle che hai ricevuto) e 'Invia notifica' (per mandare comunicazioni).",
        screenshot: '/guide/d-notifiche.jpg',
      },
      {
        title: 'Vai su Invia notifica',
        text: "Clicca sulla scheda 'Invia notifica'. Comparirà un form per creare il tuo annuncio.",
      },
      {
        title: 'Componi l\'annuncio',
        text: "Compila i campi:\n• Titolo: il titolo dell'annuncio (es. 'Lezione annullata domani')\n• Messaggio: il testo completo del comunicato\n• Destinatari: scegli chi riceve l'annuncio (tutti i tuoi studenti, un corso specifico, o un singolo studente)",
      },
      {
        title: 'Invia',
        text: "Clicca il pulsante 'Invia'. Tutti i destinatari selezionati ricevono immediatamente la notifica nella piattaforma. Se hanno abilitato le notifiche push, la ricevono anche sul browser o sul telefono.",
        tip: "Usa gli annunci per: comunicare scadenze, cambi di programma, materiali nuovi, risultati quiz.",
      },
    ],
  },
  {
    id: 'profilo',
    icon: '👤',
    title: 'Il tuo profilo',
    description: 'Come gestire i tuoi dati personali e la password.',
    tags: ['profilo', 'password', 'dati', 'nome', 'email', 'sicurezza'],
    steps: [
      {
        title: 'Apri il profilo',
        text: "Nel menu a sinistra clicca su 'Il mio profilo'. Vedi i tuoi dati: nome, email, ruolo docente.",
      },
      {
        title: 'Modifica i dati',
        text: "Clicca nel campo che vuoi modificare, apporta la modifica e clicca 'Salva'.",
      },
      {
        title: 'Cambia la password',
        text: "Nella sezione 'Sicurezza' inserisci la password attuale, poi la nuova password (due volte per conferma). Clicca 'Salva'.",
        tip: "Usa una password diversa per ogni servizio e cambiala ogni 6 mesi.",
        warning: "Non condividere mai la tua password con studenti o colleghi.",
      },
      {
        title: 'Logout',
        text: "Per uscire in modo sicuro clicca 'Esci' in fondo al menu. Sempre importante su computer condivisi.",
      },
    ],
  },
]
