-- Migration 25: collega program_days a course_sessions (calendario)
-- 6 maggio 2026

ALTER TABLE program_days
  ADD COLUMN IF NOT EXISTS linked_session_id UUID REFERENCES course_sessions(id) ON DELETE SET NULL;
