-- Migration 24: Programma del Corso + Note personali
-- Feature: struttura gerarchica editabile + sistema note rich-text
-- 6 maggio 2026

-- ============================================================
-- FEATURE 1: PROGRAMMA DEL CORSO
-- ============================================================

-- Programma principale (originale o fork personale)
CREATE TABLE IF NOT EXISTS course_programs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Programma',
  created_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES course_programs(id) ON DELETE SET NULL,
  is_fork     BOOLEAN NOT NULL DEFAULT FALSE,
  -- 'private' = solo chi l'ha creato
  -- 'instructors' = tutti i docenti del corso
  -- 'students' = visibile anche agli studenti (read-only)
  visibility  TEXT NOT NULL DEFAULT 'private'
                CHECK (visibility IN ('private', 'instructors', 'students')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Livello intermedio: settimane, moduli, blocchi tematici
CREATE TABLE IF NOT EXISTS program_modules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  UUID NOT NULL REFERENCES course_programs(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'week'
                CHECK (type IN ('week', 'module', 'block')),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Giornate, figlie di un modulo
CREATE TABLE IF NOT EXISTS program_days (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id   UUID NOT NULL REFERENCES program_modules(id) ON DELETE CASCADE,
  program_id  UUID NOT NULL REFERENCES course_programs(id) ON DELETE CASCADE,
  title       TEXT,
  day_date    DATE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Blocchi orari, figli di una giornata
CREATE TABLE IF NOT EXISTS program_blocks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id           UUID NOT NULL REFERENCES program_days(id) ON DELETE CASCADE,
  program_id       UUID NOT NULL REFERENCES course_programs(id) ON DELETE CASCADE,
  start_time       TIME,
  end_time         TIME,
  title            TEXT NOT NULL,
  description      TEXT,
  instructor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  instructor_name  TEXT,  -- campo libero per docenti esterni alla piattaforma
  is_break         BOOLEAN NOT NULL DEFAULT FALSE,  -- pausa caffè, pranzo ecc.
  order_index      INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger updated_at su course_programs
DROP TRIGGER IF EXISTS course_programs_updated_at ON course_programs;
CREATE TRIGGER course_programs_updated_at
  BEFORE UPDATE ON course_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS — PROGRAMMA
-- ============================================================

ALTER TABLE course_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_days    ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_blocks  ENABLE ROW LEVEL SECURITY;

-- course_programs: select
DROP POLICY IF EXISTS "programs_select" ON course_programs;
CREATE POLICY "programs_select" ON course_programs FOR SELECT USING (
  -- super admin vede tutto
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  OR
  -- il creatore vede sempre il suo
  created_by = auth.uid()
  OR
  -- docenti del corso vedono i programmi con visibility >= 'instructors'
  (
    visibility IN ('instructors', 'students')
    AND EXISTS (
      SELECT 1 FROM course_instructors
      WHERE course_id = course_programs.course_id
        AND instructor_id = auth.uid()
    )
  )
  OR
  -- studenti iscritti vedono solo quelli con visibility = 'students'
  (
    visibility = 'students'
    AND EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_id = course_programs.course_id
        AND student_id = auth.uid()
        AND status = 'active'
    )
  )
);

-- course_programs: insert (super_admin e docenti del corso)
DROP POLICY IF EXISTS "programs_insert" ON course_programs;
CREATE POLICY "programs_insert" ON course_programs FOR INSERT WITH CHECK (
  auth.uid() = created_by
  AND (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM course_instructors
      WHERE course_id = course_programs.course_id
        AND instructor_id = auth.uid()
    )
  )
);

-- course_programs: update (solo il creatore o super_admin)
DROP POLICY IF EXISTS "programs_update" ON course_programs;
CREATE POLICY "programs_update" ON course_programs FOR UPDATE USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  OR created_by = auth.uid()
);

-- course_programs: delete (solo il creatore o super_admin)
DROP POLICY IF EXISTS "programs_delete" ON course_programs;
CREATE POLICY "programs_delete" ON course_programs FOR DELETE USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  OR created_by = auth.uid()
);

-- program_modules: accesso eredita da course_programs tramite join
DROP POLICY IF EXISTS "program_modules_select" ON program_modules;
CREATE POLICY "program_modules_select" ON program_modules FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM course_programs cp
    WHERE cp.id = program_modules.program_id
      AND (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
        OR cp.created_by = auth.uid()
        OR (cp.visibility IN ('instructors','students') AND EXISTS (
          SELECT 1 FROM course_instructors WHERE course_id = cp.course_id AND instructor_id = auth.uid()
        ))
        OR (cp.visibility = 'students' AND EXISTS (
          SELECT 1 FROM course_enrollments WHERE course_id = cp.course_id AND student_id = auth.uid() AND status = 'active'
        ))
      )
  )
);
DROP POLICY IF EXISTS "program_modules_write" ON program_modules;
CREATE POLICY "program_modules_write" ON program_modules FOR ALL USING (
  EXISTS (
    SELECT 1 FROM course_programs cp
    WHERE cp.id = program_modules.program_id
      AND ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin' OR cp.created_by = auth.uid())
  )
);

-- program_days: stessa logica
DROP POLICY IF EXISTS "program_days_select" ON program_days;
CREATE POLICY "program_days_select" ON program_days FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM course_programs cp
    WHERE cp.id = program_days.program_id
      AND (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
        OR cp.created_by = auth.uid()
        OR (cp.visibility IN ('instructors','students') AND EXISTS (
          SELECT 1 FROM course_instructors WHERE course_id = cp.course_id AND instructor_id = auth.uid()
        ))
        OR (cp.visibility = 'students' AND EXISTS (
          SELECT 1 FROM course_enrollments WHERE course_id = cp.course_id AND student_id = auth.uid() AND status = 'active'
        ))
      )
  )
);
DROP POLICY IF EXISTS "program_days_write" ON program_days;
CREATE POLICY "program_days_write" ON program_days FOR ALL USING (
  EXISTS (
    SELECT 1 FROM course_programs cp
    WHERE cp.id = program_days.program_id
      AND ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin' OR cp.created_by = auth.uid())
  )
);

-- program_blocks: stessa logica
DROP POLICY IF EXISTS "program_blocks_select" ON program_blocks;
CREATE POLICY "program_blocks_select" ON program_blocks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM course_programs cp
    WHERE cp.id = program_blocks.program_id
      AND (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
        OR cp.created_by = auth.uid()
        OR (cp.visibility IN ('instructors','students') AND EXISTS (
          SELECT 1 FROM course_instructors WHERE course_id = cp.course_id AND instructor_id = auth.uid()
        ))
        OR (cp.visibility = 'students' AND EXISTS (
          SELECT 1 FROM course_enrollments WHERE course_id = cp.course_id AND student_id = auth.uid() AND status = 'active'
        ))
      )
  )
);
DROP POLICY IF EXISTS "program_blocks_write" ON program_blocks;
CREATE POLICY "program_blocks_write" ON program_blocks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM course_programs cp
    WHERE cp.id = program_blocks.program_id
      AND ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin' OR cp.created_by = auth.uid())
  )
);

-- ============================================================
-- FEATURE 2: NOTE PERSONALI
-- ============================================================

CREATE TABLE IF NOT EXISTS notes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL DEFAULT 'Nuova nota',
  content           JSONB,  -- formato Tiptap JSON
  created_by        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- link opzionale a un'entità del programma o corso
  linked_course_id  UUID REFERENCES courses(id) ON DELETE SET NULL,
  linked_module_id  UUID REFERENCES program_modules(id) ON DELETE SET NULL,
  linked_day_id     UUID REFERENCES program_days(id) ON DELETE SET NULL,
  linked_block_id   UUID REFERENCES program_blocks(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Condivisione nota con permessi granulari
CREATE TABLE IF NOT EXISTS note_shares (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id      UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  shared_with  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  can_edit     BOOLEAN NOT NULL DEFAULT FALSE,
  shared_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (note_id, shared_with)
);

DROP TRIGGER IF EXISTS notes_updated_at ON notes;
CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS — NOTE
-- ============================================================

ALTER TABLE notes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_shares ENABLE ROW LEVEL SECURITY;

-- notes: select (proprietario + destinatari condivisione + super_admin)
DROP POLICY IF EXISTS "notes_select" ON notes;
CREATE POLICY "notes_select" ON notes FOR SELECT USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM note_shares
    WHERE note_id = notes.id AND shared_with = auth.uid()
  )
);

DROP POLICY IF EXISTS "notes_insert" ON notes;
CREATE POLICY "notes_insert" ON notes FOR INSERT WITH CHECK (
  auth.uid() = created_by
  AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'docente')
);

-- update: proprietario o chi ha can_edit = true
DROP POLICY IF EXISTS "notes_update" ON notes;
CREATE POLICY "notes_update" ON notes FOR UPDATE USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM note_shares
    WHERE note_id = notes.id AND shared_with = auth.uid() AND can_edit = TRUE
  )
);

DROP POLICY IF EXISTS "notes_delete" ON notes;
CREATE POLICY "notes_delete" ON notes FOR DELETE USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  OR created_by = auth.uid()
);

-- Funzione security definer per evitare ricorsione circolare tra notes e note_shares
CREATE OR REPLACE FUNCTION is_note_owner(p_note_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM notes WHERE id = p_note_id AND created_by = auth.uid());
$$;

-- note_shares: solo il proprietario della nota gestisce le condivisioni
DROP POLICY IF EXISTS "note_shares_select" ON note_shares;
CREATE POLICY "note_shares_select" ON note_shares FOR SELECT USING (
  shared_with = auth.uid()
  OR is_note_owner(note_id)
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
);
DROP POLICY IF EXISTS "note_shares_write" ON note_shares;
CREATE POLICY "note_shares_write" ON note_shares FOR ALL USING (
  is_note_owner(note_id)
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
);
