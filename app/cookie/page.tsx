import Link from 'next/link'
import { ArrowLeft, Cookie } from 'lucide-react'

export const metadata = { title: 'Cookie Policy — CoachLab LMS' }

export default function CookiePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/login" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
            <ArrowLeft size={14} /> Torna al login
          </Link>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-7 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #1B3768 0%, #1565C0 100%)' }}>
            <div className="flex items-center gap-3 mb-2">
              <Cookie size={20} className="text-white opacity-80" />
              <span className="text-xs text-white opacity-70 uppercase tracking-widest font-semibold">Documento legale</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Cookie Policy</h1>
            <p className="text-sm text-blue-200 mt-1">Informativa sull'utilizzo dei cookie — D.Lgs. 196/2003 e Dir. 2009/136/CE</p>
          </div>
          <div className="px-8 py-6 space-y-6 text-sm text-gray-600 leading-relaxed">
            <p>La presente Cookie Policy descrive come la piattaforma <strong>CoachLab LMS</strong> utilizza i cookie e tecnologie simili.</p>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">Cosa sono i cookie</h2>
              <p>I cookie sono piccoli file di testo che i siti web salvano sul tuo dispositivo durante la navigazione. Vengono utilizzati per far funzionare il sito, per ricordare le tue preferenze o per raccogliere informazioni statistiche.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-3">Cookie che utilizziamo</h2>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wide">Cookie</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wide">Scopo</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wide">Consenso</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-50">
                      <td className="px-4 py-3 font-mono text-gray-700">sb-auth-token</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Tecnico</span></td>
                      <td className="px-4 py-3 text-gray-500">Mantiene la sessione di autenticazione (Supabase)</td>
                      <td className="px-4 py-3 text-green-600 font-semibold">Non richiesto</td>
                    </tr>
                    <tr className="border-b border-gray-50">
                      <td className="px-4 py-3 font-mono text-gray-700">cookie_consent</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Tecnico</span></td>
                      <td className="px-4 py-3 text-gray-500">Salva la tua scelta sul banner cookie</td>
                      <td className="px-4 py-3 text-green-600 font-semibold">Non richiesto</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono text-gray-700">_vercel_*</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">Analytics</span></td>
                      <td className="px-4 py-3 text-gray-500">Statistiche anonime di utilizzo (Vercel Analytics)</td>
                      <td className="px-4 py-3 text-amber-600 font-semibold">Richiesto</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-2">Cookie tecnici</h2>
              <p>I cookie tecnici sono strettamente necessari per il funzionamento della piattaforma (autenticazione, sicurezza della sessione). Non richiedono il tuo consenso e non possono essere disattivati senza compromettere il funzionamento del servizio.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-2">Cookie analytics</h2>
              <p>Se hai prestato il consenso, utilizziamo Vercel Analytics per raccogliere statistiche anonime sull'utilizzo della piattaforma (pagine visitate, tempi di risposta). Nessun dato personale viene trasmesso e le statistiche sono aggregate.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-2">Come gestire i cookie</h2>
              <p>Puoi modificare le tue preferenze in qualsiasi momento cliccando su "Gestisci cookie" nel banner. Puoi anche disabilitare i cookie dal tuo browser, ma alcune funzionalità della piattaforma potrebbero non funzionare correttamente.</p>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-900 mb-2">Cookie di terze parti</h2>
              <p>La piattaforma <strong>non utilizza</strong> cookie di profilazione di terze parti (Facebook, Google Ads, ecc.).</p>
            </section>

            <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">Ultimo aggiornamento: Marzo 2026</p>
          </div>
        </div>
        <div className="flex justify-center gap-6 mt-6 text-xs text-gray-400">
          <Link href="/privacy" className="hover:text-gray-600 transition">Privacy Policy</Link>
          <Link href="/termini" className="hover:text-gray-600 transition">Termini di Servizio</Link>
          <Link href="/login" className="hover:text-gray-600 transition">Login</Link>
        </div>
      </div>
    </div>
  )
}
