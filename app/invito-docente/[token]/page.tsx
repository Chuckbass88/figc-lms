import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AlertCircle, GraduationCap } from 'lucide-react'
import RegistrazioneDocenteForm from './RegistrazioneDocenteForm'

export default async function InvitoDocentePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  // Verifica token (utente non autenticato — admin bypassa RLS)
  const { data: inviteToken } = await admin
    .from('invite_tokens')
    .select('id, role, used_at, expires_at')
    .eq('token', token)
    .eq('role', 'docente')
    .single()

  if (!inviteToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link non valido</h1>
          <p className="text-gray-500 text-sm">Questo link di invito non esiste o è stato revocato. Contatta l&apos;amministratore.</p>
        </div>
      </div>
    )
  }

  if (inviteToken.used_at) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle size={48} className="text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link già utilizzato</h1>
          <p className="text-gray-500 text-sm">Questo link di invito è già stato usato per creare un account. Se hai già un account, accedi dalla pagina di login.</p>
          <a href="/login" className="mt-4 inline-block text-blue-600 text-sm hover:underline">Vai al login →</a>
        </div>
      </div>
    )
  }

  if (inviteToken.expires_at && new Date(inviteToken.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link scaduto</h1>
          <p className="text-gray-500 text-sm">Questo link di invito è scaduto. Richiedi un nuovo link all&apos;amministratore.</p>
        </div>
      </div>
    )
  }

  // Verifica se l'utente è già autenticato
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Già autenticato → redirect alla dashboard
    redirect('/docente')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(180deg, #1B3768 0%, #1565C0 50%, #f8faff 100%)' }}
    >
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-block bg-gray-50 rounded-xl px-5 py-2 mb-4 border border-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-coachlab.png" alt="CoachLab" className="h-7 w-auto object-contain" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="bg-blue-100 rounded-full p-2">
              <GraduationCap size={20} className="text-blue-700" />
            </div>
          </div>

          <p className="text-xs text-gray-400 font-medium tracking-wide uppercase mb-1">Sei stato invitato come</p>
          <h1 className="text-xl font-bold text-gray-900">Docente CoachLab</h1>
          <p className="text-sm text-gray-500 mt-2">
            Crea il tuo account per accedere alla piattaforma e gestire i tuoi corsi.
          </p>
        </div>

        <RegistrazioneDocenteForm token={token} />

        <p className="text-center text-xs text-gray-400 mt-5">
          Hai già un account?{' '}
          <a href="/login" className="text-blue-600 hover:underline">Accedi</a>
        </p>
      </div>
    </div>
  )
}
