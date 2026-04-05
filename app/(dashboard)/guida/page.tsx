import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Hub: reindirizza automaticamente alla guida giusta per il ruolo
export default async function GuidaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'studente'

  if (role === 'studente') redirect('/guida/studente')
  if (role === 'docente')  redirect('/guida/docente')

  // super_admin → vede entrambe le guide, mostra scelta
  return (
    <div className="flex flex-col items-center justify-center min-h-full py-16 px-6 bg-gray-50">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-3xl" style={{ backgroundColor: '#EFF4FF' }}>
        📖
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Guida alla piattaforma</h1>
      <p className="text-sm text-gray-500 mb-8 text-center max-w-xs">
        Scegli quale guida vuoi visualizzare
      </p>
      <div className="flex gap-4 flex-wrap justify-center">
        <a
          href="/guida/studente"
          className="flex flex-col items-center gap-2 px-8 py-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition min-w-[140px]"
        >
          <span className="text-3xl">🎓</span>
          <p className="text-sm font-bold text-gray-900">Guida Corsista</p>
          <p className="text-xs text-gray-400 text-center">Per chi segue i corsi</p>
        </a>
        <a
          href="/guida/docente"
          className="flex flex-col items-center gap-2 px-8 py-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition min-w-[140px]"
        >
          <span className="text-3xl">👨‍🏫</span>
          <p className="text-sm font-bold text-gray-900">Guida Docente</p>
          <p className="text-xs text-gray-400 text-center">Per chi insegna i corsi</p>
        </a>
      </div>
    </div>
  )
}
