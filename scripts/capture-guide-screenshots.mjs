/**
 * Cattura screenshot per la guida interattiva CoachLab.
 * Esegui con: node scripts/capture-guide-screenshots.mjs
 */
import puppeteer from 'puppeteer'
import path from 'path'
import fs from 'fs'

const sleep = ms => new Promise(r => setTimeout(r, ms))
const BASE_URL   = 'http://localhost:3000'
const OUT_DIR    = path.resolve('./public/guide')
const STUDENTE   = { email: 'antonio.ferrari@figclms.it', password: 'Figc2024!' }
const DOCENTE    = { email: 'marco.rossi@figclms.it',     password: 'Figc2024!' }

fs.mkdirSync(OUT_DIR, { recursive: true })

// ── Helper ────────────────────────────────────────────────────────────────────
async function shot(page, filename, { scrollY = 0, wait = 800, clip } = {}) {
  if (scrollY) await page.evaluate(y => window.scrollTo(0, y), scrollY)
  await sleep(wait)
  const opts = { path: path.join(OUT_DIR, filename), type: 'jpeg', quality: 88 }
  if (clip) opts.clip = clip
  await page.screenshot(opts)
  console.log('✅', filename)
}

async function login(page, { email, password }) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#email', { timeout: 8000 })
  await sleep(400)
  // Usa page.type per far scattare gli eventi React (onChange)
  await page.click('#email', { clickCount: 3 })
  await page.type('#email', email, { delay: 30 })
  await page.click('#password', { clickCount: 3 })
  await page.type('#password', password, { delay: 30 })
  await sleep(300)
  // Submit + attendi navigazione
  await page.click('button[type="submit"]')
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 })
  await sleep(1500)
}

// ── Main ─────────────────────────────────────────────────────────────────────
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
  defaultViewport: { width: 1280, height: 800 },
})

// ══════════════════════════════════
// STUDENTE
// ══════════════════════════════════
const pageS = await browser.newPage()
await pageS.setViewport({ width: 1280, height: 800 })

console.log('\n📸 STUDENTE screenshots...')

// Login page — prima dello screenshot siamo disconnessi
await pageS.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' })
await shot(pageS, 's-login.jpg', { wait: 600 })

// Login
await login(pageS, STUDENTE)

// Dashboard
await pageS.goto(`${BASE_URL}/studente`, { waitUntil: 'networkidle2' })
await shot(pageS, 's-dashboard.jpg', { wait: 1000 })

// Dashboard — sidebar zoom
await shot(pageS, 's-sidebar.jpg', { wait: 400, clip: { x: 0, y: 0, width: 240, height: 800 } })

// Corsi lista
await pageS.goto(`${BASE_URL}/studente/corsi`, { waitUntil: 'networkidle2' })
await shot(pageS, 's-corsi-lista.jpg', { wait: 1200 })

// Primo corso (se esiste)
const corsoLink = await pageS.$('a[href*="/studente/corsi/"]')
if (corsoLink) {
  await corsoLink.click()
  await pageS.waitForNavigation({ waitUntil: 'networkidle2' })
  await shot(pageS, 's-corso-dettaglio.jpg', { wait: 1200 })

  // Scheda materiali
  const materialClicked = await pageS.evaluate(() => {
    const btns = [...document.querySelectorAll('button, [role="tab"]')]
    const btn = btns.find(b => /materiali/i.test(b.textContent))
    if (btn) { btn.click(); return true }
    return false
  })
  if (materialClicked) await shot(pageS, 's-materiali.jpg', { wait: 800 })

  // Scheda quiz
  const quizClicked = await pageS.evaluate(() => {
    const btns = [...document.querySelectorAll('button, [role="tab"]')]
    const btn = btns.find(b => /quiz/i.test(b.textContent))
    if (btn) { btn.click(); return true }
    return false
  })
  if (quizClicked) await shot(pageS, 's-quiz-lista.jpg', { wait: 800 })
}

// Quiz globale
await pageS.goto(`${BASE_URL}/studente/quiz`, { waitUntil: 'networkidle2' })
await shot(pageS, 's-quiz-pagina.jpg', { wait: 1200 })

// Task
await pageS.goto(`${BASE_URL}/studente/task`, { waitUntil: 'networkidle2' })
await shot(pageS, 's-task.jpg', { wait: 1200 })

// Messaggi
await pageS.goto(`${BASE_URL}/messaggi`, { waitUntil: 'networkidle2' })
await shot(pageS, 's-messaggi.jpg', { wait: 1500 })

// Messaggi — pulsante + (modale nuovo messaggio)
const plusBtn = await pageS.$('button[title="Nuovo messaggio"], button[aria-label*="nuovo"], button svg + *')
if (!plusBtn) {
  // cerca per posizione: il + in alto nel pannello messaggi
  await pageS.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const plus = btns.find(b => b.textContent.trim() === '+' || b.innerHTML.includes('Plus'))
    if (plus) plus.click()
  })
  await shot(pageS, 's-messaggi-nuovo.jpg', { wait: 1000 })
} else {
  await plusBtn.click()
  await shot(pageS, 's-messaggi-nuovo.jpg', { wait: 1000 })
}

// Chat aperta (se esiste una conversazione)
const convLink = await pageS.$('a[href*="/messaggi/"]')
if (convLink) {
  await convLink.click()
  await pageS.waitForNavigation({ waitUntil: 'networkidle2' })
  await shot(pageS, 's-chat.jpg', { wait: 1200 })
}

// Notifiche
await pageS.goto(`${BASE_URL}/notifiche`, { waitUntil: 'networkidle2' })
await shot(pageS, 's-notifiche.jpg', { wait: 1200 })

// Presenze
await pageS.goto(`${BASE_URL}/studente/presenze`, { waitUntil: 'networkidle2' })
await shot(pageS, 's-presenze.jpg', { wait: 1200 })

// Profilo
await pageS.goto(`${BASE_URL}/profilo`, { waitUntil: 'networkidle2' })
await shot(pageS, 's-profilo.jpg', { wait: 1200 })

// Guida studente
await pageS.goto(`${BASE_URL}/guida/studente`, { waitUntil: 'networkidle2' })
await shot(pageS, 's-guida.jpg', { wait: 1500 })

await pageS.close()

// ══════════════════════════════════
// DOCENTE — contesto separato (cookie isolati)
// ══════════════════════════════════
const contextD = await browser.createBrowserContext()
const pageD = await contextD.newPage()
await pageD.setViewport({ width: 1280, height: 800 })

console.log('\n📸 DOCENTE screenshots...')
// Screenshot login page (non autenticato in questo contesto)
await pageD.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' })
await login(pageD, DOCENTE)

// Dashboard docente
await pageD.goto(`${BASE_URL}/docente`, { waitUntil: 'networkidle2' })
await shot(pageD, 'd-dashboard.jpg', { wait: 1200 })

// Corsi docente
await pageD.goto(`${BASE_URL}/docente/corsi`, { waitUntil: 'networkidle2' })
await shot(pageD, 'd-corsi.jpg', { wait: 1200 })

// Primo corso docente
const corsoLinkD = await pageD.$('a[href*="/docente/corsi/"]')
if (corsoLinkD) {
  await corsoLinkD.click()
  await pageD.waitForNavigation({ waitUntil: 'networkidle2' })
  await shot(pageD, 'd-corso-dettaglio.jpg', { wait: 1200 })
}

// Libreria quiz
await pageD.goto(`${BASE_URL}/docente/libreria-quiz`, { waitUntil: 'networkidle2' })
await shot(pageD, 'd-quiz-libreria.jpg', { wait: 1200 })

// Task
await pageD.goto(`${BASE_URL}/docente/task`, { waitUntil: 'networkidle2' })
await shot(pageD, 'd-task.jpg', { wait: 1200 })

// Corsisti
await pageD.goto(`${BASE_URL}/docente/corsisti`, { waitUntil: 'networkidle2' })
await shot(pageD, 'd-corsisti.jpg', { wait: 1200 })

// Messaggi docente
await pageD.goto(`${BASE_URL}/messaggi`, { waitUntil: 'networkidle2' })
await shot(pageD, 'd-messaggi.jpg', { wait: 1500 })

// Notifiche docente + scheda Invia
await pageD.goto(`${BASE_URL}/notifiche`, { waitUntil: 'networkidle2' })
await shot(pageD, 'd-notifiche.jpg', { wait: 1200 })

// Scheda "Invia notifica"
const sendTabClicked = await pageD.evaluate(() => {
  const tabs = [...document.querySelectorAll('button, [role="tab"]')]
  const tab = tabs.find(t => /invia/i.test(t.textContent))
  if (tab) { tab.click(); return true }
  return false
})
if (sendTabClicked) await shot(pageD, 'd-invia-notifica.jpg', { wait: 800 })

// Report
await pageD.goto(`${BASE_URL}/docente/report`, { waitUntil: 'networkidle2' })
await shot(pageD, 'd-report.jpg', { wait: 1200 })

// Guida docente
await pageD.goto(`${BASE_URL}/guida/docente`, { waitUntil: 'networkidle2' })
await shot(pageD, 'd-guida.jpg', { wait: 1500 })

await pageD.close()
await contextD.close()
await browser.close()

console.log('\n🎉 Tutti gli screenshot salvati in public/guide/')
