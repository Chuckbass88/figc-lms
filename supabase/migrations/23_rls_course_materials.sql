-- Migration 23: RLS su course_materials per target_type/target_id
-- Problema: senza queste policy uno studente può leggere materiali destinati ad altri
-- Batch 89 — 2 maggio 2026

-- Abilita RLS sulla tabella (se non già abilitata)
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;

-- Rimuovi policy esistenti generiche (se presenti da setup precedente)
DROP POLICY IF EXISTS "course_materials_select" ON course_materials;
DROP POLICY IF EXISTS "course_materials_insert" ON course_materials;
DROP POLICY IF EXISTS "course_materials_delete" ON course_materials;

-- SELECT: studente vede materiali del proprio corso filtrati per target
CREATE POLICY "course_materials_select" ON course_materials
  FOR SELECT USING (
    -- Super admin e docenti del corso vedono tutto
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM course_instructors
      WHERE course_id = course_materials.course_id
        AND instructor_id = auth.uid()
    )
    -- Studente iscritto al corso: vede in base a target_type
    OR (
      EXISTS (
        SELECT 1 FROM course_enrollments
        WHERE course_id = course_materials.course_id
          AND student_id = auth.uid()
          AND status = 'active'
      )
      AND (
        -- Materiale per tutti
        target_type = 'all'
        -- Materiale per il suo microgruppo
        OR (target_type = 'group' AND EXISTS (
          SELECT 1 FROM course_group_members
          WHERE group_id = course_materials.target_id
            AND student_id = auth.uid()
        ))
        -- Materiale solo per lui
        OR (target_type = 'student' AND target_id = auth.uid())
      )
    )
  );

-- INSERT: solo docenti del corso e super_admin
CREATE POLICY "course_materials_insert" ON course_materials
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM course_instructors
      WHERE course_id = course_materials.course_id
        AND instructor_id = auth.uid()
    )
  );

-- DELETE: solo chi ha uploadato o super_admin
CREATE POLICY "course_materials_delete" ON course_materials
  FOR DELETE USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
