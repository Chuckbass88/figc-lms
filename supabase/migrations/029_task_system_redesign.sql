-- Migration 029: Task System Redesign
-- Feedback thread, versioning, grading scale, privacy, transient storage

-- ── course_tasks — nuovi campi ───────────────────────────────────────────────
ALTER TABLE course_tasks
  ADD COLUMN IF NOT EXISTS require_file      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS accepted_formats  text[]  NOT NULL DEFAULT ARRAY['pdf','pptx','xlsx'],
  ADD COLUMN IF NOT EXISTS grade_visible     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referente_id      uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- ── task_submissions — nuovi campi ───────────────────────────────────────────
ALTER TABLE task_submissions
  ADD COLUMN IF NOT EXISTS status            text    NOT NULL DEFAULT 'consegnato'
    CHECK (status IN ('consegnato','in_revisione','valutato')),
  ADD COLUMN IF NOT EXISTS version_number    integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS grade_decimal     numeric(4,2),
  ADD COLUMN IF NOT EXISTS storage_path      text,
  ADD COLUMN IF NOT EXISTS file_deleted_at   timestamptz,
  ADD COLUMN IF NOT EXISTS deadline_extended timestamptz;

-- ── task_feedback — thread docente↔studente ──────────────────────────────────
CREATE TABLE IF NOT EXISTS task_feedback (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid        NOT NULL REFERENCES task_submissions(id) ON DELETE CASCADE,
  sender_id     uuid        NOT NULL REFERENCES profiles(id),
  sender_role   text        NOT NULL CHECK (sender_role IN ('docente','studente','super_admin','admin')),
  content       text        NOT NULL,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE task_feedback ENABLE ROW LEVEL SECURITY;

-- Docente vede il feedback delle proprie task
DROP POLICY IF EXISTS "feedback_docente_rw" ON task_feedback;
CREATE POLICY "feedback_docente_rw" ON task_feedback
  USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM task_submissions ts
      JOIN course_tasks ct ON ct.id = ts.task_id
      JOIN course_instructors ci ON ci.course_id = ct.course_id
      WHERE ts.id = task_feedback.submission_id
        AND ci.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    sender_id = auth.uid()
  );

-- Studente vede solo il proprio thread (o quello del suo gruppo)
DROP POLICY IF EXISTS "feedback_student_rw" ON task_feedback;
CREATE POLICY "feedback_student_rw" ON task_feedback
  USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM task_submissions ts
      WHERE ts.id = task_feedback.submission_id
        AND ts.student_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM task_submissions ts
      JOIN course_tasks ct ON ct.id = ts.task_id
      JOIN course_group_members cgm ON cgm.group_id = ct.group_id
      WHERE ts.id = task_feedback.submission_id
        AND cgm.student_id = auth.uid()
    )
  )
  WITH CHECK (sender_id = auth.uid());

-- Super admin / admin vedono tutto
DROP POLICY IF EXISTS "feedback_admin_all" ON task_feedback;
CREATE POLICY "feedback_admin_all" ON task_feedback
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_task_feedback_submission ON task_feedback(submission_id);
CREATE INDEX IF NOT EXISTS idx_task_feedback_created    ON task_feedback(created_at);

-- ── courses — scala voto ─────────────────────────────────────────────────────
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS grading_scale integer NOT NULL DEFAULT 10
    CHECK (grading_scale IN (10, 30, 110));

-- ── course_templates — scala voto ────────────────────────────────────────────
ALTER TABLE course_templates
  ADD COLUMN IF NOT EXISTS grading_scale integer NOT NULL DEFAULT 10
    CHECK (grading_scale IN (10, 30, 110));
