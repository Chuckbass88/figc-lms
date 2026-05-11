export type UserRole = 'super_admin' | 'admin' | 'docente' | 'studente'

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

export interface CourseSession {
  id: string
  title: string
  session_date: string
  course_id: string
}

export interface ProgramDay {
  id: string
  module_id: string
  program_id: string
  title: string | null
  day_date: string | null
  linked_session_id: string | null
  order_index: number
  created_at: string
  blocks?: ProgramBlock[]
  linked_session?: CourseSession | null
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

// ============================================================
// ADMIN PERMISSIONS (B2)
// ============================================================

export const ADMIN_PERMISSIONS = [
  'template_corsi',
  'archivio_globale_write',
  'archivio_globale_read',
  'gestione_admin',
  'import_utenti',
  'export_globale',
  'configurazioni_sistema',
  'report_globale',
] as const

export type AdminPermissionKey = typeof ADMIN_PERMISSIONS[number]

export const ADMIN_PERMISSION_LABELS: Record<AdminPermissionKey, string> = {
  template_corsi: 'Gestione Template Corsi',
  archivio_globale_write: 'Archivio Globale — Caricamento',
  archivio_globale_read: 'Archivio Globale — Lettura',
  gestione_admin: 'Gestione altri Admin',
  import_utenti: 'Importazione massiva utenti',
  export_globale: 'Export CSV globale',
  configurazioni_sistema: 'Configurazioni di sistema',
  report_globale: 'Report presenze globale',
}

export interface AdminPermission {
  id: string
  admin_user_id: string
  permission_key: AdminPermissionKey
  enabled: boolean
  updated_at: string
}

// ============================================================
// AREE DISCIPLINARI (B3)
// ============================================================

export interface Area {
  id: string
  nome: string
  descrizione: string | null
  created_at: string
}

export interface DocenteArea {
  docente_id: string
  area_id: string
  area?: Area
}

// ============================================================
// ARCHIVIO GENERALE + CORSO ARCHIVIO (B4)
// ============================================================

export interface ArchiviFile {
  id: string
  nome: string
  file_url: string
  file_name: string
  file_size: number | null
  tipo: 'PDF' | 'PPTX' | 'DOC' | 'XLSX' | 'ALTRO' | null
  uploaded_by: string | null
  corso_origine_id: string | null
  area_id: string | null
  tags: string[]
  created_at: string
  area?: Area
  corso_origine?: Pick<Course, 'id' | 'name'>
}

export interface CorsoArchivio {
  id: string
  archivio_id: string
  corso_id: string
  abilitato: boolean
  added_by: string | null
  created_at: string
  file?: ArchiviFile
}

// ============================================================
// COURSE TEMPLATES + CORSO EVENTI (B5)
// ============================================================

export interface CourseTemplate {
  id: string
  nome: string
  tipologia: string | null
  struttura_tipo: 'giorni' | 'moduli' | 'calendario'
  ore_totali: number | null
  materiali_tags: string[]
  quiz_tags: string[]
  parametri: {
    durata_giorni?: number
    tipo_corso?: string
    materie?: Array<{ nome: string; ore: number }>
    calendario?: {
      giorni_settimana: string[]
      fasce_tipo: Array<{ inizio: string; fine: string; materia: string }>
    }
  }
  created_by: string | null
  created_at: string
}

export interface TemplateModulo {
  id: string
  template_id: string
  numero: number
  titolo: string
  created_at: string
  giorni?: TemplateGiorno[]
}

export interface TemplateGiorno {
  id: string
  template_id: string
  modulo_id: string | null
  numero: number
  titolo: string | null
  giorno_settimana: number | null
  settimana_numero: number | null
  is_mezza_giornata: boolean
  created_at: string
  fasce?: TemplateFascia[]
}

export interface TemplateFascia {
  id: string
  giorno_id: string
  ora_inizio: string   // "HH:MM:SS" da DB, usa slice(0,5) per "HH:MM"
  ora_fine: string
  materia: string
  area_id: string | null
  note: string | null
  tipo_pausa: string | null
  created_at: string
  area?: Area
}

export interface CourseTemplateCompleto extends CourseTemplate {
  moduli: TemplateModulo[]   // populated solo se struttura_tipo = 'moduli'
  giorni: TemplateGiorno[]   // populated solo se struttura_tipo = 'giorni'
}

export interface CorsoEvento {
  id: string
  corso_id: string
  materia: string
  area_id: string | null
  data: string
  ora_inizio: string
  ora_fine: string
  note: string | null
  created_at: string
  area?: Area
  corso?: Pick<Course, 'id' | 'name'>
  docenti?: Array<{
    docente_id: string
    stato: 'invitato' | 'confermato' | 'declinato'
    profile?: Pick<Profile, 'id' | 'full_name'>
  }>
}
