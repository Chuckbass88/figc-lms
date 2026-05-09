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
| Setup iniziale infrastruttura | €0 (già operativo) |

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
