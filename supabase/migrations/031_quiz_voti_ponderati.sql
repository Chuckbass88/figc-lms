-- Migration 031: pesi voto ponderato + flag esame finale / quiz in media
-- Decisioni utente 2026-05-14:
--  1. Pesi su course_templates (default 40/30/30) ereditati dai corsi, editabili per-corso
--  2. Quiz intermedi nella media: scelta del docente per-corso (A=esclusi default, B=bucket task)
--  3. (libreria quota 20/docente/corso = limite soft, non gestito qui)

-- ── Pesi sul template (default di partenza) ──────────────────────────────────
ALTER TABLE course_templates
  ADD COLUMN IF NOT EXISTS peso_task      integer NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS peso_pratiche  integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS peso_esame     integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS quiz_intermedi_in_media boolean NOT NULL DEFAULT false;

-- ── Pesi sul corso (ereditati dal template alla creazione, modificabili) ─────
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS peso_task      integer NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS peso_pratiche  integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS peso_esame     integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS quiz_intermedi_in_media boolean NOT NULL DEFAULT false;

-- ── course_quizzes: distinzione esame finale + scala voto ────────────────────
-- is_esame_finale: l'esame finale conta nel peso_esame e il voto NON è mai
--   visibile allo studente. I quiz intermedi seguono quiz_intermedi_in_media.
ALTER TABLE course_quizzes
  ADD COLUMN IF NOT EXISTS is_esame_finale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS grading_scale integer NOT NULL DEFAULT 30
    CHECK (grading_scale IN (10, 30));

-- Backfill: i quiz con category 'Esame Finale' diventano esami finali
UPDATE course_quizzes
  SET is_esame_finale = true
  WHERE category = 'Esame Finale' AND is_esame_finale = false;
