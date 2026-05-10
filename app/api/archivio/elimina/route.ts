import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin', 'docente'].includes(profile.role)) {
    return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID mancante' }, { status: 400 })

  // Recupera il record per ottenere il path dello storage
  const { data: record } = await supabase
    .from('archivio_generale')
    .select('id, file_url, uploaded_by')
    .eq('id', id)
    .single()

  if (!record) return NextResponse.json({ error: 'File non trovato' }, { status: 404 })

  // Solo chi ha caricato il file o super_admin può eliminarlo
  if (profile.role !== 'super_admin' && record.uploaded_by !== user.id) {
    return NextResponse.json({ error: 'Non autorizzato a eliminare questo file' }, { status: 403 })
  }

  // Elimina da storage (documento-library)
  if (record.file_url) {
    const urlObj = new URL(record.file_url)
    // Estrae il path dopo /object/public/document-library/
    const match = urlObj.pathname.match(/\/object\/public\/document-library\/(.+)/)
    if (match?.[1]) {
      await supabase.storage.from('document-library').remove([decodeURIComponent(match[1])])
    }
  }

  // Elimina record DB (corso_archivio cascada via FK)
  const { error: dbError } = await supabase
    .from('archivio_generale')
    .delete()
    .eq('id', id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
