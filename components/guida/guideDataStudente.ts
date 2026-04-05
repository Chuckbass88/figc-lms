export interface GuideStep {
  title: string
  text: string
  tip?: string
  warning?: string
  screenshot?: string   // path in /public/guide/
}

export interface GuideSection {
  id: string
  icon: string
  title: string
  description: string
  steps: GuideStep[]
  tags?: string[]
}

export const STUDENTE_QUICK_ACTIONS = [
  { label: '📚 Accedere ai miei corsi',     sectionId: 'corsi' },
  { label: '🧪 Fare un quiz',               sectionId: 'quiz' },
  { label: '💬 Inviare un messaggio',        sectionId: 'messaggi' },
  { label: '🔔 Vedere le notifiche',         sectionId: 'notifiche' },
  { label: '📄 Scaricare materiali',         sectionId: 'materiali' },
  { label: '👤 Cambiare la password',        sectionId: 'profilo' },
]

export const STUDENTE_SECTIONS: GuideSection[] = [
  {
    id: 'accesso',
    icon: '🔐',
    title: 'Come accedere alla piattaforma',
    description: 'Come fare il login per la prima volta e ogni volta che vuoi usare la piattaforma.',
    tags: ['login', 'accesso', 'password', 'email', 'entrare'],
    steps: [
      {
        title: 'Apri il browser',
        text: 'Apri il programma per navigare su internet che usi di solito: Chrome (il cerchio colorato), Safari (la bussola), Firefox (la volpe arancione) oppure Edge (la "e" blu). Puoi farlo dal computer, dal tablet o dallo smartphone.',
        tip: 'Consigliamo Google Chrome per la migliore esperienza.',
      },
      {
        title: "Vai all'indirizzo della piattaforma",
        text: "Clicca sulla barra degli indirizzi in alto nel browser (dove compare l'indirizzo del sito, es. www.google.com) e scrivi l'indirizzo che ti ha fornito la tua scuola/ente. Poi premi il tasto Invio sulla tastiera.",
        tip: "Salva l'indirizzo tra i segnalibri per trovarlo facilmente la prossima volta.",
      },
      {
        title: 'Inserisci la tua email',
        text: "Vedrai la pagina di login con due campi bianchi. Nel primo campo scritto 'Email', inserisci l'indirizzo email con cui sei registrato (es. mario.rossi@gmail.com). Fai attenzione a non lasciare spazi prima o dopo.",
        warning: "Se non ricordi con quale email sei registrato, contatta il tuo docente o l'amministratore.",
        screenshot: '/guide/s-login.jpg',
      },
      {
        title: 'Inserisci la tua password',
        text: "Nel secondo campo scritto 'Password', inserisci la tua password. Le lettere appariranno come punti (●●●●) per sicurezza. Fai attenzione alle lettere maiuscole: 'A' e 'a' sono diverse!",
        tip: "Puoi cliccare sull'icona dell'occhio 👁 a destra del campo password per vedere quello che stai scrivendo.",
      },
      {
        title: 'Clicca il pulsante Accedi',
        text: "Clicca il pulsante blu grande scritto 'Accedi'. Aspetta qualche secondo. Se email e password sono corretti, entri nella piattaforma e vedi la tua pagina principale (dashboard).",
        warning: "Se compare il messaggio 'Credenziali non valide', controlla che non ci siano errori nell'email o nella password e riprova. Dopo 5 tentativi l'accesso verrà bloccato temporaneamente.",
        tip: "La prossima volta che accedi, molti browser ricordano la tua email automaticamente.",
      },
    ],
  },
  {
    id: 'dashboard',
    icon: '🏠',
    title: 'La tua pagina principale (dashboard)',
    description: 'Cosa trovi nella tua pagina principale e come orientarti nella piattaforma.',
    tags: ['home', 'dashboard', 'menu', 'navigare', 'orientarsi'],
    steps: [
      {
        title: 'Panoramica della pagina principale',
        text: "Dopo il login arrivi automaticamente alla tua dashboard. È la tua 'casa' nella piattaforma. Qui trovi un riepilogo di tutto: i tuoi corsi, le ultime notifiche, i prossimi impegni.",
        screenshot: '/guide/s-dashboard.jpg',
      },
      {
        title: 'Il menu a sinistra',
        text: "Sul lato sinistro dello schermo c'è il menu di navigazione con tutte le sezioni della piattaforma:\n• Dashboard → torna alla pagina principale\n• I Miei Corsi → vedi i tuoi corsi\n• Le Mie Task → consegne da fare\n• I Miei Quiz → test disponibili\n• Messaggi → chat con docenti\n• Notifiche → aggiornamenti\n• Il mio profilo → i tuoi dati",
        tip: "Su smartphone il menu si apre toccando le tre lineette ☰ in alto a sinistra.",
        screenshot: '/guide/s-sidebar.jpg',
      },
      {
        title: 'Il pulsante in alto a destra',
        text: "In alto a destra trovi le iniziali del tuo nome (es. 'MR' per Mario Rossi). Cliccandoci puoi accedere al tuo profilo o fare il logout (uscire dalla piattaforma).",
      },
      {
        title: 'Come tornare sempre alla home',
        text: "In qualsiasi sezione tu sia, puoi sempre tornare alla pagina principale cliccando 'Dashboard' nel menu a sinistra, oppure cliccando il logo CoachLab in alto.",
      },
    ],
  },
  {
    id: 'corsi',
    icon: '📚',
    title: 'I tuoi corsi',
    description: 'Come trovare i corsi a cui sei iscritto e come aprirli.',
    tags: ['corsi', 'lezioni', 'iscrizione', 'studiare'],
    steps: [
      {
        title: 'Apri la sezione Corsi',
        text: "Nel menu a sinistra, clicca su 'I Miei Corsi'. Si aprirà una pagina con tutti i corsi a cui sei iscritto. Ogni corso è mostrato come una scheda con il nome, il docente e un indicatore dei tuoi progressi.",
        warning: "Se la lista è vuota, non sei ancora iscritto a nessun corso. Contatta il tuo docente per farti iscrivere.",
        screenshot: '/guide/s-corsi-lista.jpg',
      },
      {
        title: 'Apri un corso',
        text: "Clicca sulla scheda del corso che vuoi aprire. Verrai portato alla pagina del corso con tutte le sue sezioni.",
        screenshot: '/guide/s-corso-dettaglio.jpg',
      },
      {
        title: "Cosa trovi dentro un corso",
        text: "Dentro ogni corso trovi più schede:\n• Panoramica → informazioni generali\n• Lezioni → contenuti da studiare\n• Materiali → file PDF, video e documenti\n• Quiz → test di verifica\n• Task → consegne da completare\n• Presenze → le tue presenze registrate\n\nClicca sulle schede per navigare tra le sezioni.",
      },
      {
        title: 'Segui i tuoi progressi',
        text: "In ogni corso vedi una barra o una percentuale che indica quanto hai completato. Più studi e completi le lezioni, più il tuo progresso aumenta.",
        tip: "Completa le lezioni in ordine: spesso le lezioni successive si sbloccano solo dopo aver completato le precedenti.",
      },
    ],
  },
  {
    id: 'lezioni',
    icon: '📖',
    title: 'Studiare le lezioni',
    description: 'Come seguire le lezioni del corso e segnare i progressi.',
    tags: ['lezione', 'studiare', 'completare', 'video', 'contenuto'],
    steps: [
      {
        title: 'Apri la lista delle lezioni',
        text: "Dentro un corso, clicca sulla scheda 'Lezioni'. Vedrai un elenco numerato di tutte le lezioni del corso, con un indicatore se le hai già completate (✓ verde) o meno.",
      },
      {
        title: 'Apri una lezione',
        text: "Clicca sul titolo di una lezione per aprirla. Si aprirà il contenuto della lezione: potrebbe essere un testo da leggere, un video da guardare, immagini o una combinazione di tutto.",
        tip: "Inizia sempre dalla prima lezione e procedi in ordine.",
      },
      {
        title: 'Studia il contenuto',
        text: "Leggi con attenzione tutto il testo. Se c'è un video, clicca il tasto ▶ (play) per avviarlo. Puoi mettere in pausa cliccando di nuovo, o regolare il volume. Puoi rivedere i video tutte le volte che vuoi.",
        tip: "Se non capisci qualcosa, rileggi la sezione o guarda il video di nuovo. Puoi anche mandare un messaggio al docente.",
      },
      {
        title: 'Segna la lezione come completata',
        text: "Quando hai finito di studiare la lezione, clicca il pulsante 'Segna come completata' (di solito in fondo alla pagina o in alto a destra). Il cerchio accanto alla lezione diventerà verde ✓.",
        warning: "Non passare alla lezione successiva se non hai capito quella attuale. È importante studiare bene prima di andare avanti.",
      },
      {
        title: 'Vai alla lezione successiva',
        text: "Clicca su 'Lezione successiva' oppure torna all'elenco e clicca la prossima lezione. Continua così fino a completare tutte le lezioni del corso.",
      },
    ],
  },
  {
    id: 'materiali',
    icon: '📄',
    title: 'Materiali del corso',
    description: 'Come trovare e scaricare i file e i documenti condivisi dal docente.',
    tags: ['materiali', 'pdf', 'file', 'scaricare', 'allegati', 'documenti'],
    steps: [
      {
        title: 'Apri la sezione Materiali',
        text: "Dentro un corso, clicca sulla scheda 'Materiali'. Troverai tutti i file che il docente ha caricato: dispense PDF, presentazioni, esercizi, video aggiuntivi e altro.",
      },
      {
        title: 'Visualizza un materiale',
        text: "Clicca sul nome del file o sull'icona per aprirlo. I PDF si aprono direttamente nel browser, le immagini si visualizzano subito.",
        tip: "Per aprire i file Word (.docx) o Excel (.xlsx) potrebbe servirti Microsoft Office o Google Docs.",
      },
      {
        title: 'Scarica un materiale',
        text: "Per salvare un file sul tuo computer, clicca sull'icona di download (freccia verso il basso ↓) accanto al file. Il file verrà salvato nella cartella 'Download' del tuo computer.",
      },
    ],
  },
  {
    id: 'quiz',
    icon: '🧪',
    title: 'Fare un quiz',
    description: 'Come trovare, iniziare e completare un test di verifica.',
    tags: ['quiz', 'test', 'domande', 'risposta', 'punteggio', 'voto'],
    steps: [
      {
        title: 'Apri la sezione Quiz',
        text: "Dentro un corso, clicca sulla scheda 'Quiz'. Oppure usa la voce 'I Miei Quiz' nel menu a sinistra per vedere tutti i quiz disponibili in tutti i tuoi corsi.",
        screenshot: '/guide/s-quiz-pagina.jpg',
      },
      {
        title: 'Controlla i dettagli del quiz',
        text: "Prima di iniziare, leggi le informazioni del quiz:\n• Quante domande ci sono\n• Tempo massimo (se c'è un limite di tempo)\n• Quante volte puoi rifarlo\n• Data di scadenza (se c'è)\n\nAssicurati di essere pronto prima di cominciare.",
        warning: "Se il quiz ha un timer, una volta cliccato 'Inizia' il tempo parte e non si ferma. Non chiudere la pagina!",
      },
      {
        title: 'Inizia il quiz',
        text: "Clicca il pulsante 'Inizia quiz'. Apparirà la prima domanda. Se c'è un timer lo vedrai in alto che conta il tempo rimanente.",
      },
      {
        title: 'Rispondi alle domande',
        text: "Per ogni domanda:\n• Leggi attentamente la domanda\n• Leggi tutte le risposte disponibili\n• Clicca sul cerchio (○) accanto alla risposta che ritieni corretta — diventerà pieno (●)\n• Puoi cambiare risposta cliccando su un'altra opzione prima di andare avanti",
        tip: "Se non sei sicuro di una risposta, segna quella che ti sembra più probabile e vai avanti. Potresti avere la possibilità di tornare indietro.",
      },
      {
        title: 'Naviga tra le domande',
        text: "Clicca 'Domanda successiva' per avanzare. Alcune interfacce mostrano tutti i numeri delle domande in alto: clicca su un numero per saltare a quella domanda.",
      },
      {
        title: 'Invia le risposte',
        text: "Quando hai risposto a tutte le domande, clicca il pulsante 'Invia risposte' o 'Termina quiz'. Ti verrà chiesta una conferma: clicca 'Sì, invia' per confermare.",
        warning: "Una volta inviato non puoi modificare le risposte. Controlla bene prima di inviare!",
      },
      {
        title: 'Vedi il risultato',
        text: "Dopo l'invio vedi subito il tuo risultato: il punteggio ottenuto (es. 8/10), la percentuale di correttezza e spesso le risposte corrette evidenziate in verde e quelle sbagliate in rosso.",
        tip: "Se hai sbagliato qualcosa, rileggi le lezioni corrispondenti e riprova (se il quiz lo permette).",
      },
    ],
  },
  {
    id: 'task',
    icon: '✅',
    title: 'Consegnare un task (compito)',
    description: 'Come inviare i compiti e le consegne assegnate dal docente.',
    tags: ['task', 'compito', 'consegna', 'allegare', 'inviare'],
    steps: [
      {
        title: 'Apri la sezione Task',
        text: "Clicca su 'Le Mie Task' nel menu a sinistra. Vedrai la lista di tutti i compiti che ti sono stati assegnati, con la data di scadenza e lo stato (Da fare, Consegnato, Valutato).",
        screenshot: '/guide/s-task.jpg',
      },
      {
        title: 'Apri un task',
        text: "Clicca sul nome del task per aprirlo. Leggi attentamente la consegna: cosa ti viene chiesto di fare, eventuali istruzioni e la data entro cui devi consegnare.",
        warning: "Fai attenzione alla data di scadenza! Dopo quella data potresti non poter più consegnare.",
      },
      {
        title: 'Carica il tuo lavoro',
        text: "Quando sei pronto a consegnare, cerca il pulsante 'Carica file' o 'Allega'. Clicca e si aprirà una finestra per scegliere il file dal tuo computer. Seleziona il file e clicca 'Apri'.",
        tip: "I formati accettati di solito sono PDF, Word (.docx), immagini (.jpg, .png). Converti sempre in PDF se possibile.",
      },
      {
        title: 'Invia la consegna',
        text: "Dopo aver caricato il file, clicca 'Consegna' o 'Invia'. Lo stato del task cambierà in 'Consegnato'. Il docente riceverà una notifica.",
      },
      {
        title: 'Controlla la valutazione',
        text: "Quando il docente valuta il tuo lavoro, ricevi una notifica. Torna nel task per vedere il voto e gli eventuali commenti del docente.",
      },
    ],
  },
  {
    id: 'messaggi',
    icon: '💬',
    title: 'Messaggi',
    description: 'Come comunicare con i docenti e i compagni tramite la chat interna.',
    tags: ['messaggi', 'chat', 'scrivere', 'comunicare', 'docente', 'rispondere'],
    steps: [
      {
        title: 'Apri la sezione Messaggi',
        text: "Nel menu a sinistra, clicca su 'Messaggi'. Si apre la pagina dei messaggi con due colonne: a sinistra la lista delle tue conversazioni, a destra i messaggi della conversazione selezionata.",
        tip: "Un punto blu nel menu 'Messaggi' indica che hai messaggi non letti.",
        screenshot: '/guide/s-messaggi.jpg',
      },
      {
        title: 'Inizia una nuova conversazione',
        text: "Per scrivere a qualcuno per la prima volta, clicca il pulsante '+' (più) in alto nel pannello a sinistra. Si aprirà una finestra.",
        screenshot: '/guide/s-messaggi-nuovo.jpg',
      },
      {
        title: 'Cerca la persona',
        text: "Nella finestra che si apre, digita il nome della persona a cui vuoi scrivere (es. il tuo docente). Mentre scrivi, appariranno i risultati. Clicca sul nome della persona per selezionarla.",
        tip: "Puoi filtrare per 'Docenti' usando i pulsanti dei filtri in alto nella ricerca.",
      },
      {
        title: 'Scrivi e invia il messaggio',
        text: "Dopo aver selezionato la persona, si apre un campo di testo. Scrivi il tuo messaggio e poi clicca 'Invia messaggio'. La conversazione si aprirà subito.",
      },
      {
        title: 'Rispondere a un messaggio',
        text: "Per rispondere a una conversazione esistente, cliccala nella colonna a sinistra. Il campo testo è in fondo alla pagina. Scrivi la tua risposta e premi il pulsante freccia → oppure premi Cmd+Invio (Mac) o Ctrl+Invio (Windows).",
        screenshot: '/guide/s-chat.jpg',
      },
      {
        title: 'Ricevere messaggi',
        text: "Quando qualcuno ti scrive ricevi una notifica. La conversazione apparirà nella colonna sinistra con un punto blu ● per indicare i messaggi non letti. Clicca sulla conversazione per leggerla.",
      },
    ],
  },
  {
    id: 'notifiche',
    icon: '🔔',
    title: 'Notifiche',
    description: 'Come tenere traccia degli aggiornamenti importanti della piattaforma.',
    tags: ['notifiche', 'avvisi', 'aggiornamenti', 'campanella', 'letto'],
    steps: [
      {
        title: 'Dove trovare le notifiche',
        text: "Le notifiche si trovano cliccando su 'Notifiche' nel menu a sinistra. Un numero (es. 3) accanto alla voce indica quante notifiche non hai ancora letto.",
        screenshot: '/guide/s-notifiche.jpg',
      },
      {
        title: 'Tipi di notifiche che puoi ricevere',
        text: "Le notifiche ti avvertono di:\n• Un nuovo messaggio ricevuto\n• Un quiz disponibile o in scadenza\n• Un task valutato dal docente\n• Annunci del docente\n• Aggiornamenti sul corso",
      },
      {
        title: 'Leggere una notifica',
        text: "Clicca su una notifica per aprirla. Le notifiche non lette hanno un colore più acceso. Una volta cliccate diventano grigie (segnate come lette).",
      },
      {
        title: 'Segna tutto come letto',
        text: "Se vuoi azzerare tutte le notifiche in una volta, cerca il pulsante 'Segna tutte come lette' in alto nella pagina notifiche.",
      },
    ],
  },
  {
    id: 'presenze',
    icon: '📊',
    title: 'Le mie presenze',
    description: 'Come controllare il registro delle tue presenze alle lezioni.',
    tags: ['presenze', 'registro', 'assenza', 'ritardo', 'frequenza'],
    steps: [
      {
        title: 'Apri la sezione Presenze',
        text: "Nel menu a sinistra, clicca su 'Le mie presenze'. Vedrai il registro completo delle tue presenze suddiviso per corso.",
        screenshot: '/guide/s-presenze.jpg',
      },
      {
        title: 'Come leggere il registro',
        text: "Per ogni sessione (lezione in aula o online) vedrai:\n• 🟢 Verde = Presente\n• 🔴 Rosso = Assente\n• 🟡 Giallo = In ritardo\n\nVedi anche la percentuale totale di presenze.",
        tip: "Controlla spesso le presenze per assicurarti che siano corrette. Se noti un errore, contatta il tuo docente.",
      },
      {
        title: 'Soglia minima di presenze',
        text: "Alcuni corsi richiedono una percentuale minima di presenze (es. 70%) per poter sostenere l'esame finale o ottenere il certificato. Tieni sempre sotto controllo la tua percentuale.",
        warning: "Se la tua percentuale scende sotto la soglia richiesta, potresti non poter ottenere il certificato del corso. Parla subito con il docente!",
      },
    ],
  },
  {
    id: 'profilo',
    icon: '👤',
    title: 'Il tuo profilo',
    description: 'Come visualizzare e modificare i tuoi dati personali e la password.',
    tags: ['profilo', 'password', 'dati', 'nome', 'email', 'sicurezza', 'cambiare'],
    steps: [
      {
        title: 'Apri il tuo profilo',
        text: "Nel menu a sinistra, clicca su 'Il mio profilo'. Vedrai i tuoi dati personali: nome completo, email, ruolo e foto profilo.",
        screenshot: '/guide/s-profilo.jpg',
      },
      {
        title: 'Modifica i tuoi dati',
        text: "Se vuoi modificare il tuo nome o altri dati, clicca nel campo che vuoi cambiare e digita il nuovo valore. Poi clicca il pulsante 'Salva' per confermare le modifiche.",
        tip: "Non puoi modificare la tua email da solo: contatta l'amministratore per cambiarla.",
      },
      {
        title: 'Cambia la password',
        text: "Cerca la sezione 'Cambia password'. Inserisci la tua password attuale nel primo campo, poi la nuova password due volte (per conferma). Clicca 'Salva'.",
        tip: "Scegli una password sicura: almeno 8 caratteri, con lettere maiuscole, minuscole e numeri.",
        warning: "Non condividere mai la tua password con nessuno, neanche con i docenti.",
      },
      {
        title: 'Logout (uscire dalla piattaforma)',
        text: "Per uscire dalla piattaforma in modo sicuro, clicca su 'Esci' o 'Logout' in fondo al menu a sinistra. È importante fare il logout quando usi un computer condiviso.",
      },
    ],
  },
]
