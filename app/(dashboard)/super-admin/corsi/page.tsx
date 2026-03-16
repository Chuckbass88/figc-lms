import { createClient } from '@/lib/supabase/server'
import CorsiClient from './CorsiClient'

export default async function SuperAdminCorsi() {
  const supabase = await createClient()

  const { data: courses } = await supabase
    .from('courses')
    .select(`
      id, name, description, location, status, category, start_date, end_date, created_at, updated_at,
      course_instructors(instructor_id, profiles(full_name)),
      course_enrollments(id, status)
    `)
    .order('created_at', { ascending: false })

  const courseIds = (courses ?? []).map(c => c.id)
  const { data: sessionRows } = courseIds.length > 0
    ? await supabase.from('course_sessions').select('course_id').in('course_id', courseIds)
    : { data: [] }

  const sessionCountByCourse: Record<string, number> = {}
  for (const s of sessionRows ?? []) {
    sessionCountByCourse[s.course_id] = (sessionCountByCourse[s.course_id] ?? 0) + 1
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <CorsiClient initialCourses={(courses ?? []) as any} sessionCountByCourse={sessionCountByCourse} />
}
