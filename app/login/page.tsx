import LoginForm from '@/components/auth/LoginForm'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ disattivato?: string; redirect?: string }> }) {
  const { disattivato, redirect } = await searchParams

  return (
    <div className="min-h-screen flex" style={{ background: '#F8FAFC' }}>

      {/* Pannello sinistro — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12">

        {/* Logo grande centrato */}
        <div className="flex flex-col items-center justify-center flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-coachlab.png" alt="CoachLab" className="w-72 h-auto object-contain mb-10" />
          <h2 className="text-4xl font-bold leading-tight mb-4 text-center" style={{ color: '#0F172A' }}>
            Piattaforma per formare<br />
            <span style={{ color: '#0891B2' }}>gli allenatori</span>
          </h2>
        </div>

        <p className="text-xs text-center" style={{ color: '#94A3B8' }}>
          © {new Date().getFullYear()} CoachLab — Tutti i diritti riservati
        </p>
      </div>

      {/* Pannello destro — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-block bg-white rounded-2xl px-6 py-3 shadow-lg mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-coachlab.png" alt="CoachLab" className="h-8 w-auto object-contain" />
            </div>
          </div>

          {/* Card form */}
          <div className="rounded-2xl p-8" style={{ background: '#ffffff', border: '1px solid #E2E8F0', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
            <div className="mb-6">
              <h2 className="text-xl font-bold" style={{ color: '#0F172A' }}>Accedi</h2>
              <p className="text-sm mt-1" style={{ color: '#64748B' }}>Inserisci le tue credenziali per continuare</p>
            </div>

            {disattivato === '1' && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                Il tuo account è stato disattivato. Contatta un amministratore.
              </div>
            )}

            <LoginForm redirectTo={redirect} />
          </div>

          <p className="text-center text-xs mt-5" style={{ color: '#94A3B8' }}>
            © {new Date().getFullYear()} CoachLab — Tutti i diritti riservati
          </p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="/privacy" className="text-xs transition hover:text-[#0891B2]" style={{ color: '#94A3B8' }}>Privacy Policy</a>
            <span style={{ color: '#CBD5E1' }}>·</span>
            <a href="/termini" className="text-xs transition hover:text-[#0891B2]" style={{ color: '#94A3B8' }}>Termini</a>
            <span style={{ color: '#CBD5E1' }}>·</span>
            <a href="/cookie" className="text-xs transition hover:text-[#0891B2]" style={{ color: '#94A3B8' }}>Cookie</a>
          </div>
        </div>
      </div>
    </div>
  )
}
