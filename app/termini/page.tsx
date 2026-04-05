import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'

export const metadata = { title: 'Termini di Servizio — CoachLab LMS' }

export default function TerminiPage() {
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
              <FileText size={20} className="text-white opacity-80" />
              <span className="text-xs text-white opacity-70 uppercase tracking-widest font-semibold">Documento legale</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Termini di Servizio</h1>
            <p className="text-sm text-blue-200 mt-1">Condizioni di utilizzo della piattaforma CoachLab LMS</p>
          </div>
          <div className="px-8 py-6 space-y-6 text-sm text-gray-600 leading-relaxed">
            <p>Accedendo e utilizzando la piattaforma <strong>CoachLab LMS</strong>, l'utente accetta integralmente i presenti Termini di Servizio.</p>
            <section>
              <h2 className="text-base font-bold text-gray-900 mb-2">1. Accesso alla piattaforma</h2>
              <p>L'accesso è riservato esclusivamente agli utenti invitati dall'ente organizzatore del corso. Le credenziali sono strettamente personali, non cedibili e non condivisibili con terzi.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-gray-900 mb-2">2. Utilizzo dei contenuti</h2>
              <p>I materiali didattici, quiz, documenti e qualsiasi contenuto presente sulla piattaforma sono riservati ai corsisti iscritti. È vietata la riproduzione, distribuzione o condivisione non autorizzata dei contenuti.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-gray-900 mb-2">3. Responsabilità dell'utente</h2>
              <p>L'utente è responsabile della correttezza delle informazioni fornite, del corretto utilizzo della piattaforma e di qualsiasi contenuto caricato (elaborati, file). È vietato caricare contenuti illeciti, offensivi o che violino diritti di terzi.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-gray-900 mb-2">4. Sospensione e disattivazione</h2>
              <p>L'ente organizzatore si riserva il diritto di sospendere o disattivare l'account in caso di:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Violazione dei presenti Termini</li>
                <li>Comportamenti inappropriati verso altri utenti</li>
                <li>Condivisione non autorizzata delle credenziali</li>
                <li>Fine del percorso formativo</li>
              </ul>
            </section>
            <section>
              <h2 className="text-base font-bold text-gray-900 mb-2">5. Limitazione di responsabilità</h2>
              <p>Il gestore della piattaforma (<strong>Alessandro Danti</strong>) non è responsabile per danni diretti, indiretti, incidentali o consequenziali derivanti dall'utilizzo o dall'impossibilità di utilizzo della piattaforma, inclusi — a titolo esemplificativo e non esaustivo — perdita di dati, interruzioni del servizio dovute a manutenzione programmata, guasti tecnici, attacchi informatici o eventi di forza maggiore. L'accesso alla piattaforma è fornito "così com'è" e "secondo disponibilità". Il gestore si impegna a garantire la continuità del servizio compatibilmente con le risorse tecniche disponibili, senza tuttavia assumere alcuna garanzia di disponibilità continuativa.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-gray-900 mb-2">6. Legge applicabile e foro</h2>
              <p>I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia è competente il foro di <strong>Pistoia</strong>.</p>
            </section>
            <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">Ultimo aggiornamento: Marzo 2026</p>
          </div>
        </div>
        <div className="flex justify-center gap-6 mt-6 text-xs text-gray-400">
          <Link href="/privacy" className="hover:text-gray-600 transition">Privacy Policy</Link>
          <Link href="/cookie" className="hover:text-gray-600 transition">Cookie Policy</Link>
          <Link href="/login" className="hover:text-gray-600 transition">Login</Link>
        </div>
      </div>
    </div>
  )
}
