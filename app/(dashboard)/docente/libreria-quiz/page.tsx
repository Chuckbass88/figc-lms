export const dynamic = 'force-dynamic'

import Link from 'next/link'
import QuizPage from '@/app/(dashboard)/docente/quiz/page'
import DomandePage from '@/app/(dashboard)/docente/domande/page'

/**
 * Libreria Quiz — docente
 * Accorpa "I Miei Quiz" e "Mia Libreria Domande" in un'unica schermata con tab.
 * Usa searchParams.tab per il routing lato server (nessun client state, URL condivisibile).
 */
export default async function LibreriaQuizDocentePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; categoria?: string }>
}) {
  const params = await searchParams
  const activeTab = params.tab === 'domande' ? 'domande' : 'quiz'

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <Link
          href="/docente/libreria-quiz"
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'quiz'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          I miei quiz
        </Link>
        <Link
          href="/docente/libreria-quiz?tab=domande"
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'domande'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Libreria domande
        </Link>
      </div>

      {/* Contenuto del tab attivo */}
      {activeTab === 'quiz' ? (
        // Passiamo categoria per mantenere il filtro attivo se presente nell'URL
        <QuizPage
          searchParams={Promise.resolve({ categoria: params.categoria })}
          basePath="/docente/libreria-quiz"
        />
      ) : (
        <DomandePage />
      )}
    </div>
  )
}
