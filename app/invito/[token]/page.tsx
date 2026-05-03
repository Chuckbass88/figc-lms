import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { CheckCircle, AlertCircle, BookOpen } from 'lucide-react'
import RegistrazioneForm from './RegistrazioneForm'

export default async function InvitoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  // Cerca il corso con questo token — admin bypassa RLS (utente non autenticato)
  const { data: course } = await admin
    .from('courses')
    .select('id, name, description, location, start_date, end_date, status')
    .eq('invite_token', token)
    .single()

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link non valido</h1>
          <p className="text-gray-500 text-sm">Questo link di invito non esiste o è stato revocato.</p>
        </div>
      </div>
    )
  }

  // Verifica se l'utente è già autenticato
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Non autenticato → form di registrazione
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(180deg, #1B3768 0%, #1565C0 50%, #f8faff 100%)' }}>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="inline-block bg-gray-50 rounded-xl px-5 py-2 mb-4 border border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-coachlab.png" alt="CoachLab" className="h-7 w-auto object-contain" />
            </div>
            <p className="text-xs text-gray-400 font-medium tracking-wide uppercase mb-1">Sei stato invitato a</p>
            <h1 className="text-xl font-bold text-gray-900">{course.name}</h1>
            {course.description && (
              <p className="text-sm text-gray-500 mt-2">{course.description}</p>
            )}
          </div>

          <p className="text-xs text-gray-500 text-center mb-5">Compila il modulo per creare il tuo account e iscriverti al corso.</p>

          <RegistrazioneForm token={token} courseId={course.id} />

          <p className="text-center text-xs text-gray-400 mt-5">
            Hai già un account?{' '}
            <Link href={`/login?redirect=/invito/${token}`} className="text-blue-600 hover:underline">Accedi</Link>
          </p>
        </div>
      </div>
    )
  }

  // Utente autenticato — recupera il profilo
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  // Solo i corsisti possono iscriversi tramite invito
  if (profile?.role !== 'studente') {
    const isDocente = profile?.role === 'docente'
    const dashboardHref = isDocente
      ? `/docente/corsi/${course.id}`
      : `/super-admin/corsi/${course.id}`
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle size={48} className="text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link di invito per corsisti</h1>
          <p className="text-gray-500 text-sm mb-1">
            Questo link serve ai corsisti per iscriversi a <strong>{course.name}</strong>.
          </p>
          <p className="text-gray-400 text-sm mb-6">
            Il tuo account ({profile?.role === 'docente' ? 'Docente' : 'Amministratore'}) non può iscriversi come corsista tramite questo link.
          </p>
          <Link
            href={dashboardHref}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition"
            style={{ backgroundColor: '#1565C0' }}
          >
            <BookOpen size={16} /> Vai al pannello corso
          </Link>
          <Link href="/" className="mt-3 inline-block text-sm text-gray-400 hover:underline">Torna alla dashboard</Link>
        </div>
      </div>
    )
  }

  // Controlla se è già iscritto
  const { data: existing } = await supabase
    .from('course_enrollments')
    .select('id, status')
    .eq('course_id', course.id)
    .eq('student_id', user.id)
    .single()

  if (existing) {
    // Già iscritto
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Già iscritto</h1>
          <p className="text-gray-500 text-sm mb-6">Sei già iscritto al corso <strong>{course.name}</strong>.</p>
          <Link
            href={`/studente/corsi/${course.id}`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition"
            style={{ backgroundColor: '#1565C0' }}
          >
            <BookOpen size={16} /> Vai al corso
          </Link>
        </div>
      </div>
    )
  }

  // Iscrivi il corsista
  await supabase.from('course_enrollments').insert({
    course_id: course.id,
    student_id: user.id,
    status: 'active',
    enrolled_at: new Date().toISOString(),
  })

  // Redirect al corso
  redirect(`/studente/corsi/${course.id}`)
}
