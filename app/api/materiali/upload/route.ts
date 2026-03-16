import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'docente'].includes(profile.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File
  const courseId = formData.get('course_id') as string
  const name = formData.get('name') as string
  const description = formData.get('description') as string

  if (!file || !courseId || !name) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()
  const path = `${courseId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('course-materials')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from('course-materials').getPublicUrl(path)

  const { data: material, error: dbError } = await supabase
    .from('course_materials')
    .insert({
      course_id: courseId,
      name: name.trim(),
      description: description?.trim() || null,
      file_url: urlData.publicUrl,
      file_type: ext?.toUpperCase() ?? 'FILE',
      file_size: file.size,
      uploaded_by: user.id,
    })
    .select('id, name, description, file_url, file_type, file_size, created_at')
    .single()

  if (dbError) {
    await supabase.storage.from('course-materials').remove([path])
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ material })
}
