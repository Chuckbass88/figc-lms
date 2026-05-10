import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin', 'docente'].includes(profile.role)) {
    return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const nome = formData.get('nome') as string
  const area_id = formData.get('area_id') as string | null
  const corso_id = formData.get('corso_id') as string | null
  const tags = (formData.get('tags') as string | null)?.split(',').filter(Boolean) ?? []

  if (!file || !nome) {
    return NextResponse.json({ error: 'File e nome obbligatori' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toUpperCase()
  const tipo = ['PDF', 'PPTX', 'DOC', 'XLSX'].includes(ext ?? '') ? ext : 'ALTRO'

  // Usa document-library (bucket esistente con policy corrette)
  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `archivio-generale/${user.id}/${timestamp}_${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('document-library')
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: 'Errore upload: ' + uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('document-library').getPublicUrl(storagePath)

  const { data: archivioRecord, error: dbError } = await supabase
    .from('archivio_generale')
    .insert({
      nome,
      file_url: publicUrl,
      file_name: file.name,
      file_size: file.size,
      tipo: tipo as string,
      uploaded_by: user.id,
      corso_origine_id: corso_id ?? null,
      area_id: area_id ?? null,
      tags,
    })
    .select()
    .single()

  if (dbError) {
    // Rollback storage
    await supabase.storage.from('document-library').remove([storagePath])
    return NextResponse.json({ error: 'Errore DB: ' + dbError.message }, { status: 500 })
  }

  if (corso_id && archivioRecord) {
    await supabase.from('corso_archivio').insert({
      archivio_id: archivioRecord.id,
      corso_id,
      abilitato: true,
      added_by: user.id,
    })
  }

  return NextResponse.json({ success: true, file: archivioRecord })
}
