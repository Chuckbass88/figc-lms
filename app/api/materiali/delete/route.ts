import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID mancante' }, { status: 400 })

  const { data: material } = await supabase
    .from('course_materials')
    .select('file_url, course_id')
    .eq('id', id)
    .single()

  if (!material) return NextResponse.json({ error: 'Materiale non trovato' }, { status: 404 })

  // Estrai path dal file_url
  const url = new URL(material.file_url)
  const path = url.pathname.split('/course-materials/')[1]
  if (path) {
    await supabase.storage.from('course-materials').remove([path])
  }

  await supabase.from('course_materials').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
