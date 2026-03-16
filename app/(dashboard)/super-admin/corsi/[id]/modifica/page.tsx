import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CourseForm from '@/components/courses/CourseForm'
import type { Course } from '@/lib/types'

export default async function ModificaCorso({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .single()

  if (!course) notFound()

  return <CourseForm course={course as Course} />
}
