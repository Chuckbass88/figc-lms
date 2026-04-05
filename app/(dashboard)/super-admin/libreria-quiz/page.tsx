export const dynamic = 'force-dynamic'

import Link from 'next/link'
import AdminQuizPage from '@/app/(dashboard)/super-admin/quiz/page'
import LibreriaDomandePage from '@/app/(dashboard)/super-admin/domande/page'

/**
 * Libreria Quiz — super_admin
 * Accorpa "Panoramica Quiz" e "Archivio Domande" in un'unica schermata con tab.
 * Usa searchParams.tab per il routing lato server.
 */
export default async function LibreriaQuizAdminPage({
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
          href="/super-admin/libreria-quiz"
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'quiz'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Panoramica quiz
        </Link>
        <Link
          href="/super-admin/libreria-quiz?tab=domande"
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'domande'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Archivio domande
        </Link>
      </div>

      {/* Contenuto del tab attivo */}
      {activeTab === 'quiz' ? (
        <AdminQuizPage
          searchParams={Promise.resolve({ categoria: params.categoria })}
          basePath="/super-admin/libreria-quiz"
        />
      ) : (
        <LibreriaDomandePage />
      )}
    </div>
  )
}
