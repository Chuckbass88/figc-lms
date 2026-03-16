import LoginForm from '@/components/auth/LoginForm'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ disattivato?: string; redirect?: string }> }) {
  const { disattivato, redirect } = await searchParams

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #001233 0%, #003DA5 60%, #0055D4 100%)' }}>

      {/* Pannello sinistro — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C96A)' }}>
            <span className="font-black text-xs tracking-tight" style={{ color: '#001233' }}>FIGC</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm">FIGC LMS</p>
            <p className="text-blue-300 text-xs">Formazione Allenatori</p>
          </div>
        </div>

        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Portale di Formazione<br />
            <span style={{ color: '#C9A84C' }}>Federazione Italiana</span><br />
            Giuoco Calcio
          </h2>
          <p className="text-blue-200 text-base leading-relaxed max-w-sm">
            Gestione corsi, allenatori e corsisti in un&apos;unica piattaforma dedicata alla formazione del calcio italiano.
          </p>
        </div>

        <p className="text-blue-400 text-xs">
          © {new Date().getFullYear()} Federazione Italiana Giuoco Calcio
        </p>
      </div>

      {/* Pannello destro — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl shadow-lg mb-3"
              style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C96A)' }}>
              <span className="font-black text-base tracking-tight" style={{ color: '#001233' }}>FIGC</span>
            </div>
            <h1 className="text-xl font-bold text-white">FIGC LMS</h1>
          </div>

          {/* Card form */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Accedi</h2>
              <p className="text-sm text-gray-500 mt-1">Inserisci le tue credenziali per continuare</p>
            </div>

            {disattivato === '1' && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                Il tuo account è stato disattivato. Contatta un amministratore.
              </div>
            )}

            <LoginForm redirectTo={redirect} />
          </div>

          <p className="text-center text-xs text-blue-300 mt-5">
            © {new Date().getFullYear()} FIGC — Tutti i diritti riservati
          </p>
        </div>
      </div>
    </div>
  )
}
