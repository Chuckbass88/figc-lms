import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Search, Users, BookOpen, GraduationCap, UserCheck, Layers } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = { active: 'Attivo', completed: 'Completato', draft: 'Bozza' }
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  draft: 'bg-amber-100 text-amber-700',
}
const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  docente: 'Docente',
  studente: 'Corsista',
}
const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  docente: 'bg-blue-100 text-blue-700',
  studente: 'bg-green-100 text-green-700',
}

export default async function CercaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  const supabase = await createClient()

  let users: { id: string; full_name: string; email: string; role: string; is_active: boolean }[] = []
  let courses: { id: string; name: string; description: string | null; status: string; category: string | null; location: string | null }[] = []

  if (query.length >= 2) {
    const [{ data: usersData }, { data: coursesData }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, role, is_active')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('full_name')
        .limit(20),
      supabase
        .from('courses')
        .select('id, name, description, status, category, location')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%,location.ilike.%${query}%`)
        .order('name')
        .limit(20),
    ])
    users = usersData ?? []
    courses = coursesData ?? []
  }

  const hasResults = users.length > 0 || courses.length > 0
  const hasQuery = query.length >= 2

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Ricerca globale</h2>
        <p className="text-gray-500 text-sm mt-1">Cerca utenti, corsi e corsisti</p>
      </div>

      {/* Search form */}
      <form action="/super-admin/cerca" method="get">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Cerca per nome, email, corso, categoria, sede..."
            autoFocus
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg text-white text-sm font-semibold transition hover:opacity-90"
            style={{ backgroundColor: '#003DA5' }}
          >
            Cerca
          </button>
        </div>
        {query.length > 0 && query.length < 2 && (
          <p className="text-xs text-amber-600 mt-1.5">Inserisci almeno 2 caratteri.</p>
        )}
      </form>

      {hasQuery && (
        <>
          {/* Utenti */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Users size={15} className="text-blue-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Utenti</h3>
              <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {users.length}
              </span>
            </div>
            {users.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {users.map(u => (
                  <Link
                    key={u.id}
                    href={`/super-admin/utenti/${u.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition group"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: '#003DA5' }}
                    >
                      {u.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{u.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                      {u.role === 'docente' && (
                        <UserCheck size={13} className="text-blue-400" />
                      )}
                      {u.role === 'studente' && (
                        <GraduationCap size={13} className="text-green-500" />
                      )}
                      {!u.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">
                          Disattivato
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-5 py-4 text-sm text-gray-400">Nessun utente trovato per &ldquo;{query}&rdquo;.</p>
            )}
          </div>

          {/* Corsi */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <BookOpen size={15} className="text-indigo-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Corsi</h3>
              <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                {courses.length}
              </span>
            </div>
            {courses.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {courses.map(c => (
                  <Link
                    key={c.id}
                    href={`/super-admin/corsi/${c.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition group"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Layers size={14} className="text-indigo-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition truncate">{c.name}</p>
                      {(c.description || c.location) && (
                        <p className="text-xs text-gray-400 truncate">{c.location ?? c.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {c.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">
                          {c.category}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-5 py-4 text-sm text-gray-400">Nessun corso trovato per &ldquo;{query}&rdquo;.</p>
            )}
          </div>

          {!hasResults && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Search size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nessun risultato per &ldquo;{query}&rdquo;</p>
              <p className="text-gray-400 text-sm mt-1">Prova con un termine diverso.</p>
            </div>
          )}
        </>
      )}

      {!hasQuery && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Search size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Inserisci almeno 2 caratteri per cercare.</p>
        </div>
      )}
    </div>
  )
}
