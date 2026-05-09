# Business Plan — Costi Operativi CoachLab LMS
**Data:** 9 maggio 2026  
**Versione:** 1.0  
**Autore:** Alessandro Danti

---

## Sommario Esecutivo

CoachLab LMS è costruito su un'architettura cloud-native che sfrutta servizi managed (Supabase, Vercel, Resend) per minimizzare i costi operativi e massimizzare la scalabilità. Questo documento analizza i costi mensili su tre fasce di utilizzo rappresentative e illustra la struttura di pricing proposta per il cliente.

Il punto di forza del modello di business è la bassissima spesa operativa rispetto al valore generato: a partire da ~€1/mese per un pilota fino a ~€194/mese per scala nazionale, con margini potenzialmente superiori al 90%.

---

## 1. Fasce di Utilizzo Analizzate

| Fascia | Corsisti | Corsi | Docenti | Admin |
|--------|----------|-------|---------|-------|
| **Small — Pilota** | ~50 | 5 | 10 | 2 |
| **Medium — Crescita** | ~300 | 30 | 60 | 5 |
| **Large — Scala Nazionale** | 1.000+ | 100 | 200 | 15 |

---

## 2. Analisi Servizi e Costi

### 2.1 Supabase — Database, Auth, Storage, Realtime

Supabase fornisce il backend principale della piattaforma: database PostgreSQL, autenticazione utenti, storage file e canali realtime.

| Piano | Prezzo | Incluso |
|-------|--------|---------|
| **Free** | $0/mese | 500 MB DB, 1 GB Storage, 50.000 MAU, 2 progetti |
| **Pro** | $25/mese | 8 GB DB, 100 GB Storage, MAU illimitati, daily backups |
| **Team** | $599/mese | Tutto Pro + SLA, SOC2, PITR 14gg, supporto prioritario |

- **Small:** Piano Free (sufficiente per 50 utenti e volumi contenuti)
- **Medium:** Piano Pro — $25/mese (~€23/mese)
- **Large:** Piano Pro con add-on storage/compute stimati — $25–99/mese (~€23–91/mese). Il piano Team è necessario solo in presenza di requisiti SLA formali o compliance avanzata.

---

### 2.2 Vercel — Hosting Next.js

Vercel è la piattaforma di deployment ufficiale per Next.js, con edge network globale, deploy automatici da Git e preview branch.

| Piano | Prezzo | Incluso |
|-------|--------|---------|
| **Hobby** | $0/mese | 100 GB bandwidth, deployment illimitati, uso non commerciale |
| **Pro** | $20/mese | 1 TB bandwidth, protezione DDoS, analytics, custom domains commerciali |

> **Nota:** Il piano Hobby non è utilizzabile per uso commerciale. Per qualsiasi deployment a pagamento o per conto di un cliente, è obbligatorio il piano Pro.

- **Small:** Piano Hobby in fase pilota interna — $0/mese. Passare a Pro non appena il servizio diventa commerciale.
- **Medium:** Piano Pro — $20/mese (~€18/mese)
- **Large:** Piano Pro — $20/mese (~€18/mese)

---

### 2.3 Resend — Email Transazionale

Resend gestisce tutte le email transazionali della piattaforma: registrazioni, inviti, notifiche corsi, recupero password.

| Piano | Prezzo | Incluso |
|-------|--------|---------|
| **Free** | $0/mese | 3.000 email/mese, 1 dominio |
| **Pro** | $20/mese | 50.000 email/mese, domini illimitati, analytics avanzati |

Stima volumi email mensili:
- Small: ~200 email/mese (inviti + notifiche 50 utenti)
- Medium: ~2.000–3.000 email/mese
- Large: ~8.000–15.000 email/mese

- **Small:** Piano Free — $0/mese
- **Medium:** Piano Free (al limite) o Pro — $0–20/mese (~€0–18/mese)
- **Large:** Piano Pro — $20/mese (~€18/mese)

---

### 2.4 Expo / EAS — App Mobile

EAS (Expo Application Services) gestisce build e distribuzione dell'app mobile CoachLab su iOS e Android.

| Piano | Prezzo | Incluso |
|-------|--------|---------|
| **Free** | $0/mese | 30 build/mese, aggiornamenti OTA limitati |
| **Production** | $29/mese | Build illimitate, OTA illimitati, priorità build queue |

- **Small:** Piano Free (30 build/mese sufficienti per sviluppo e test) — $0/mese
- **Medium:** Piano Production (build frequenti, rilasci regolari) — $29/mese (~€27/mese)
- **Large:** Piano Production — $29/mese (~€27/mese)

---

### 2.5 Sentry — Error Monitoring

Sentry monitora errori e performance dell'applicazione web e mobile, con alerting in tempo reale.

| Piano | Prezzo | Incluso |
|-------|--------|---------|
| **Free** | $0/mese | 5.000 errori/mese, 1 utente, 30 giorni retention |
| **Team** | $26/mese | 50.000 errori/mese, utenti illimitati, 90 giorni retention |

- **Small:** Piano Free — $0/mese
- **Medium:** Piano Team — $26/mese (~€24/mese)
- **Large:** Piano Team — $26/mese (~€24/mese)

---

### 2.6 Dominio coachlab.it

Registrazione e rinnovo annuale del dominio `.it` presso registrar italiano.

| Voce | Costo |
|------|-------|
| Registrazione/rinnovo annuale | ~€15/anno |
| Costo mensile medio | ~€1,25/mese |

Applicabile a tutte le fasce.

---

## 3. Tabella Riepilogativa Costi Mensili

| Servizio | Small (Pilota) | Medium (Crescita) | Large (Nazionale) |
|----------|---------------|-------------------|-------------------|
| Supabase | €0 (Free) | €23 (Pro) | €23–91 (Pro+) |
| Vercel | €0 (Hobby)* | €18 (Pro) | €18 (Pro) |
| Resend | €0 (Free) | €0–18 (Free/Pro) | €18 (Pro) |
| Expo / EAS | €0 (Free) | €27 (Production) | €27 (Production) |
| Sentry | €0 (Free) | €24 (Team) | €24 (Team) |
| Dominio .it | €1 | €1 | €1 |
| **TOTALE STIMATO** | **~€1/mese** | **~€93–111/mese** | **~€111–179/mese** |

> *Per uso commerciale il piano Vercel Pro (~€18/mese) è obbligatorio anche per Small. Il totale Small commerciale diventa ~€19/mese.  
> I prezzi in USD sono convertiti al tasso indicativo $1 = €0,92.

---

## 4. Ipotesi di Pricing per il Cliente

La struttura di licenza proposta è su base annuale per singolo ente (federazione regionale, società sportiva, centro tecnico).

| Piano | Target | Prezzo Annuale | Prezzo Mensile Equivalente |
|-------|--------|---------------|---------------------------|
| **Starter** | Fino a 50 corsisti | **€1.500/anno** | €125/mese |
| **Growth** | Fino a 300 corsisti | **€6.000/anno** | €500/mese |
| **Enterprise** | 300+ corsisti | **€15.000+/anno** | €1.250+/mese |

### 4.1 Analisi Marginalità

| Piano | Ricavo Annuale | Costo Operativo Annuale | Margine Lordo | Marginalità % |
|-------|---------------|------------------------|---------------|---------------|
| Starter | €1.500 | ~€228 (€19/mese) | ~€1.272 | **~85%** |
| Growth | €6.000 | ~€1.200 (€100/mese) | ~€4.800 | **~80%** |
| Enterprise | €15.000+ | ~€2.000 (€167/mese) | ~€13.000+ | **~87%** |

> I costi operativi includono la quota dominio ma escludono costi fissi come sviluppo, supporto e commerciale.

---

## 5. Note sulla Scalabilità

### Supabase
Il piano Pro supporta fino a ~8 GB di database e 100 GB di storage — ampiamente sufficiente per la fascia Medium. Per la fascia Large, i compute add-on di Supabase permettono di scalare incrementalmente senza salti di piano. Il passaggio al piano Team ($599/mese) è giustificato solo in presenza di SLA contrattuale con il cliente o requisiti di compliance (es. ISO 27001, GDPR enterprise).

### Vercel
Il piano Pro include 1 TB di bandwidth mensile, più che sufficiente per qualsiasi fascia di utilizzo attuale. La piattaforma scala automaticamente senza configurazione infrastrutturale.

### Resilienza dei dati
Supabase Pro include backup giornalieri automatici. Per la fascia Large con dati sensibili (certificazioni FIGC), valutare l'aggiunta di Point-in-Time Recovery (PITR), disponibile nel piano Team o come add-on.

---

## 6. Conclusioni

CoachLab LMS beneficia di un **modello di costo eccezionalmente favorevole** grazie all'architettura cloud-native:

- **Costi operativi minimi**: da ~€1/mese per un pilota a ~€179/mese per scala nazionale, con nessun costo infrastrutturale fisso (server, sysadmin, licenze enterprise).
- **Alta marginalità**: i margini lordi stimati superano l'80% su tutti i piani di pricing proposti, lasciando ampio spazio per costi di sviluppo, supporto e commercializzazione.
- **Scalabilità graduale**: ogni servizio adottato (Supabase, Vercel, Resend, EAS, Sentry) scala in modo incrementale, senza "salti di costo" bruschi tra le fasce. Il sistema può crescere da 50 a 1.000+ corsisti aumentando la spesa operativa di soli ~€160/mese.
- **Zero lock-in infrastrutturale**: tutti i servizi offrono export dei dati e piani free/entry che permettono di partire con investimento minimo.
- **Time-to-market rapido**: l'utilizzo di servizi managed elimina la necessità di DevOps dedicato nelle prime fasi, accelerando il go-to-market.

La struttura di pricing proposta (€1.500–€15.000/anno) posiziona CoachLab LMS come una soluzione accessibile per enti sportivi di qualsiasi dimensione, mantenendo margini che sostengono sia lo sviluppo continuo della piattaforma sia un'eventuale struttura commerciale dedicata.

---

*Documento generato il 9 maggio 2026. I prezzi dei servizi terzi sono indicativi e soggetti a variazioni. Verificare sempre i listini aggiornati sui siti ufficiali dei provider.*
