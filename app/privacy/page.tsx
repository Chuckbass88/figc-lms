import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'

export const metadata = { title: 'Privacy Policy — CoachLab LMS' }

export default function PrivacyPage() {
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
              <Shield size={20} className="text-white opacity-80" />
              <span className="text-xs text-white opacity-70 uppercase tracking-widest font-semibold">Documento legale</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
            <p className="text-sm text-blue-200 mt-1">Informativa sul trattamento dei dati personali — Art. 13 GDPR</p>
          </div>
          <div className="mx-8 mt-6 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 flex gap-3">
            <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠️</span>
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Testo placeholder — da validare con un avvocato specializzato in GDPR prima del lancio.</strong>
            </p>
          </div>
          <div className="px-8 py-6 space-y-6 text-sm text-gray-600 leading-relaxed">
            <p>La presente informativa descrive come vengono raccolti, utilizzati e protetti i dati personali degli utenti della piattaforma <strong>CoachLab LMS</strong>, ai sensi del GDPR (UE) 2016/679 e del D.Lgs. 196/2003.</p>
            <section>
              <h2 className="text-base font-bold text-gray-900 mb-2">1. Titolare del trattamento</h2>
              <p><strong>Alessandro Danti</strong><br />Via Forrottoli 196, 51039 Quarrata (PT)<br />Email: <a href="mailto:privacy@coachlab.it" className="text-blue-600 hover:underline">privacy@coachlab.it</a></p>
            </section>
            <section>
              <h2 className="text-base font-bold text-gray-900 mb-2">2. Dati raccolti</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Nome, cognome, indirizzo email</li>
                <li>Log di accesso, progressi corsi, risultati quiz</li>
                <li>Elaborati didattici caricati come task</li>
                <li>Registrazioni presenze alle sessioni</li>
              </ul>
            </section>
            <section>
              <h2 className="text-base font-bold text-gray-900 mb-2">3. Finalità e base giuridica</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Gestione della formazione — esecuzione del contratto</li>
                <li>Comunicazione docenti/corsisti — esecuzione del contratto</li>
                <li>Certificazione frequenza e idoneità — obbligo legale</li>
                <li>Sicurezza della piattaforma — interesse legittimo</li>
              </ul>
            </section>
            <section>
              <h2 className="text-base font-bold text-gray-900 mb-2">4. Conservazione</h2>
              <p>Non oltre <strong>5 anni dalla conclusione del corso</strong>, salvo obblighi di legge.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-gray-900 mb-2">5. Fornitori (responsabili ex art. 28)</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Supabase Inc.</strong> — database e autenticazione (server EU-Frankfurt ✅)</li>
                <li><strong>Vercel Inc.</strong> — hosting applicazione</li>
                <li><strong>Resend Inc.</strong> — email transazionali</li>
              </ul>
            </section>
            <section>
              <h2 className="text-base font-bold text-gray-900 mb-2">6. Diritti dell'interessato</h2>
              <p>Accesso, rettifica, cancellazione, limitazione, portabilità, opposizione, reclamo al Garante Privacy. Contatto: <a href="mailto:privacy@coachlab.it" className="text-blue-600 hover:underline">privacy@coachlab.it</a></p>
            </section>
            <section>
              <h2 className="text-base font-bold text-gray-900 mb-2">7. Cookie</h2>
              <p>Utilizziamo solo cookie tecnici per la sessione di autenticazione. Vedi la <Link href="/cookie" className="text-blue-600 hover:underline">Cookie Policy</Link>.</p>
            </section>
            <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">Ultimo aggiornamento: Marzo 2026</p>
          </div>
        </div>
        <div className="flex justify-center gap-6 mt-6 text-xs text-gray-400">
          <Link href="/termini" className="hover:text-gray-600 transition">Termini di Servizio</Link>
          <Link href="/cookie" className="hover:text-gray-600 transition">Cookie Policy</Link>
          <Link href="/login" className="hover:text-gray-600 transition">Login</Link>
        </div>
      </div>
    </div>
  )
}
