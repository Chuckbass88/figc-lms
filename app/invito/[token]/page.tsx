import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CheckCircle, AlertCircle, LogIn, BookOpen } from 'lucide-react'

export default async function InvitoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  // Cerca il corso con questo token
  const { data: course } = await supabase
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
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Non autenticato → mostra la pagina del corso + invito al login
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" style={{ background: 'linear-gradient(180deg, #001233 0%, #003DA5 50%, #f8faff 100%)' }}>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #E8C96A 100%)' }}>
              <span className="font-black text-sm" style={{ color: '#001233' }}>FIGC</span>
            </div>
            <p className="text-xs text-gray-400 font-medium tracking-wide uppercase mb-1">Sei stato invitato a</p>
            <h1 className="text-xl font-bold text-gray-900">{course.name}</h1>
            {course.description && (
              <p className="text-sm text-gray-500 mt-2">{course.description}</p>
            )}
            {course.location && (
              <p className="text-xs text-gray-400 mt-1">📍 {course.location}</p>
            )}
          </div>

          <div className="bg-blue-50 rounded-xl p-4 mb-6 text-sm text-blue-700">
            Per completare l&apos;iscrizione, accedi con il tuo account FIGC LMS.
          </div>

          <Link
            href={`/login?redirect=/invito/${token}`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition"
            style={{ backgroundColor: '#003DA5' }}
          >
            <LogIn size={16} /> Accedi e iscriviti
          </Link>
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle size={48} className="text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Accesso non disponibile</h1>
          <p className="text-gray-500 text-sm">I link di invito sono riservati ai corsisti. Il tuo account ha un ruolo diverso.</p>
          <Link href="/" className="mt-6 inline-block text-sm text-blue-600 hover:underline">Torna alla dashboard</Link>
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
            style={{ backgroundColor: '#003DA5' }}
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
