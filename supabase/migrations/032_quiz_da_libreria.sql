-- Migration 032: quiz/esame "da libreria" — estrazione per-studente al runtime
-- Modello (deciso 2026-05-18):
--  Il form definisce solo le REGOLE. Le domande vengono pescate dal software
--  dalla libreria (docente_question_library + question_library) filtrata, in
--  ordine casuale, DIVERSE per ogni studente, estratte al runtime e congelate
--  per-tentativo (snapshot) così il grading resta coerente.

-- ── Config estrazione su course_quizzes ──────────────────────────────────────
ALTER TABLE course_quizzes
  ADD COLUMN IF NOT EXISTS from_library    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS course_tag      text,
  ADD COLUMN IF NOT EXISTS pool_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pool_difficolta text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS extract_count   integer;

-- ── Snapshot domande estratte per singolo tentativo ──────────────────────────
CREATE TABLE IF NOT EXISTS quiz_attempt_questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id  uuid NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  source      text NOT NULL CHECK (source IN ('docente', 'globale')),
  lib_question_id uuid,                       -- riferimento alla domanda di libreria (può sparire)
  text        text NOT NULL,
  points      integer NOT NULL DEFAULT 1,
  order_index integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_attempt_options (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_question_id uuid NOT NULL REFERENCES quiz_attempt_questions(id) ON DELETE CASCADE,
  text                text NOT NULL,
  is_correct          boolean NOT NULL DEFAULT false,
  order_index         integer NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_qaq_attempt ON quiz_attempt_questions(attempt_id);
CREATE INDEX IF NOT EXISTS idx_qao_question ON quiz_attempt_options(attempt_question_id);

-- quiz_answers: supporto risposte su snapshot (legacy question_id/option_id restano per quiz fissi)
ALTER TABLE quiz_answers
  ADD COLUMN IF NOT EXISTS attempt_question_id uuid REFERENCES quiz_attempt_questions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS attempt_option_id   uuid REFERENCES quiz_attempt_options(id) ON DELETE CASCADE;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE quiz_attempt_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempt_options   ENABLE ROW LEVEL SECURITY;

-- Studente: vede/usa solo gli snapshot dei propri tentativi.
-- Docente/super_admin: lettura per i risultati.
DROP POLICY IF EXISTS "qaq_select" ON quiz_attempt_questions;
CREATE POLICY "qaq_select" ON quiz_attempt_questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM quiz_attempts a WHERE a.id = attempt_id AND a.student_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('docente','super_admin','admin'))
);
DROP POLICY IF EXISTS "qaq_insert" ON quiz_attempt_questions;
CREATE POLICY "qaq_insert" ON quiz_attempt_questions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM quiz_attempts a WHERE a.id = attempt_id AND a.student_id = auth.uid())
);

DROP POLICY IF EXISTS "qao_select" ON quiz_attempt_options;
CREATE POLICY "qao_select" ON quiz_attempt_options FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM quiz_attempt_questions q
    JOIN quiz_attempts a ON a.id = q.attempt_id
    WHERE q.id = attempt_question_id AND a.student_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('docente','super_admin','admin'))
);
DROP POLICY IF EXISTS "qao_insert" ON quiz_attempt_options;
CREATE POLICY "qao_insert" ON quiz_attempt_options FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM quiz_attempt_questions q
    JOIN quiz_attempts a ON a.id = q.attempt_id
    WHERE q.id = attempt_question_id AND a.student_id = auth.uid()
  )
);
