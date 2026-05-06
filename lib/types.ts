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

// ============================================================
// PROGRAMMA DEL CORSO
// ============================================================

export type ProgramVisibility = 'private' | 'instructors' | 'students'
export type ModuleType = 'week' | 'module' | 'block'

export interface CourseProgram {
  id: string
  course_id: string
  title: string
  created_by: string
  parent_id: string | null
  is_fork: boolean
  visibility: ProgramVisibility
  created_at: string
  updated_at: string
  creator?: Pick<Profile, 'id' | 'full_name'>
}

export interface ProgramModule {
  id: string
  program_id: string
  title: string
  type: ModuleType
  order_index: number
  created_at: string
  days?: ProgramDay[]
}

export interface ProgramDay {
  id: string
  module_id: string
  program_id: string
  title: string | null
  day_date: string | null
  order_index: number
  created_at: string
  blocks?: ProgramBlock[]
}

export interface ProgramBlock {
  id: string
  day_id: string
  program_id: string
  start_time: string | null
  end_time: string | null
  title: string
  description: string | null
  instructor_id: string | null
  instructor_name: string | null
  is_break: boolean
  order_index: number
  created_at: string
  instructor?: Pick<Profile, 'id' | 'full_name'>
}

// Programma con gerarchia completa (per editor e view)
export interface ProgramWithDetails extends CourseProgram {
  modules: (ProgramModule & { days: (ProgramDay & { blocks: ProgramBlock[] })[] })[]
}

// ============================================================
// NOTE PERSONALI
// ============================================================

export interface Note {
  id: string
  title: string
  content: object | null  // Tiptap JSON
  created_by: string
  linked_course_id: string | null
  linked_module_id: string | null
  linked_day_id: string | null
  linked_block_id: string | null
  created_at: string
  updated_at: string
  creator?: Pick<Profile, 'id' | 'full_name'>
  shares?: NoteShare[]
}

export interface NoteShare {
  id: string
  note_id: string
  shared_with: string
  can_edit: boolean
  shared_at: string
  user?: Pick<Profile, 'id' | 'full_name' | 'email'>
}

// ============================================================

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  read: boolean
  created_at: string
}
