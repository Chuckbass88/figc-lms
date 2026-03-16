import { redirect } from 'next/navigation'

export default async function MaterialiStudenteRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/studente/corsi/${id}`)
}
