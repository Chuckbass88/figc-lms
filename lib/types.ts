export type UserRole = 'super_admin' | 'docente' | 'studente'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  name: string
  description?: string
  location?: string
  start_date?: string
  end_date?: string
  status: 'active' | 'completed' | 'draft'
  category?: string | null
  created_at: string
  updated_at: string
}

export interface CourseWithDetails extends Course {
  instructors?: Profile[]
  students?: Profile[]
  enrollment_count?: number
}

export interface CourseEnrollment {
  id: string
  course_id: string
  student_id: string
  enrolled_at: string
  status: 'active' | 'completed' | 'withdrawn'
  course?: Course
  student?: Profile
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  read: boolean
  created_at: string
}
