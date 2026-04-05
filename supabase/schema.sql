-- ============================================================
-- FIGC LMS — Schema Database (idempotente: sicuro da rieseguire)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- TIPI ENUM
-- ============================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'docente', 'studente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE course_status AS ENUM ('draft', 'active', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABELLE
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  full_name  TEXT NOT NULL,
  role       user_role NOT NULL DEFAULT 'studente',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  location    TEXT,
  start_date  DATE,
  end_date    DATE,
  status      course_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_instructors (
  course_id     UUID REFERENCES courses(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, instructor_id)
);

CREATE TABLE IF NOT EXISTS course_enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID REFERENCES courses(id) ON DELETE CASCADE,
  student_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status      enrollment_status NOT NULL DEFAULT 'active',
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (course_id, student_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUNZIONI E TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS courses_updated_at ON courses;
CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'studente')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (
    auth.uid() = id
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'docente'
  );

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "courses_select_all" ON courses;
CREATE POLICY "courses_select_all" ON courses
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "courses_admin_write" ON courses;
CREATE POLICY "courses_admin_write" ON courses
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

DROP POLICY IF EXISTS "ci_select_all" ON course_instructors;
CREATE POLICY "ci_select_all" ON course_instructors
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ci_admin_write" ON course_instructors;
CREATE POLICY "ci_admin_write" ON course_instructors
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

DROP POLICY IF EXISTS "ce_select" ON course_enrollments;
CREATE POLICY "ce_select" ON course_enrollments
  FOR SELECT USING (
    student_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM course_instructors
      WHERE course_instructors.course_id = course_enrollments.course_id
        AND course_instructors.instructor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ce_admin_write" ON course_enrollments;
CREATE POLICY "ce_admin_write" ON course_enrollments
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

DROP POLICY IF EXISTS "notifications_own" ON notifications;
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- MESSAGGISTICA INTERNA
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at    TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_created ON messages(conversation_id, created_at);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- conversations: visibile solo ai partecipanti
DROP POLICY IF EXISTS "conv_participant_select" ON conversations;
CREATE POLICY "conv_participant_select" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "conv_insert_auth" ON conversations;
CREATE POLICY "conv_insert_auth" ON conversations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- conversation_participants: visibile ai partecipanti della stessa conv
DROP POLICY IF EXISTS "cp_select" ON conversation_participants;
CREATE POLICY "cp_select" ON conversation_participants
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
        AND cp2.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "cp_insert_auth" ON conversation_participants;
CREATE POLICY "cp_insert_auth" ON conversation_participants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cp_update_own" ON conversation_participants;
CREATE POLICY "cp_update_own" ON conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

-- messages: leggibili e scrivibili solo dai partecipanti
DROP POLICY IF EXISTS "msg_select" ON messages;
CREATE POLICY "msg_select" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "msg_insert" ON messages;
CREATE POLICY "msg_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

-- Abilita Supabase Realtime sulla tabella messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================================
-- MIGRAZIONE 14 — Timer quiz e started_at
-- ============================================================

ALTER TABLE course_quizzes ADD COLUMN IF NOT EXISTS timer_minutes INTEGER DEFAULT 30;
ALTER TABLE quiz_attempts   ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- ============================================================
-- MIGRAZIONE 15 — Libreria domande personale docente
-- ============================================================

CREATE TABLE IF NOT EXISTS docente_question_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  category TEXT,
  difficulty TEXT DEFAULT 'medio',
  is_shared BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS docente_question_library_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES docente_question_library(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE docente_question_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE docente_question_library_options ENABLE ROW LEVEL SECURITY;

-- Il docente vede le sue + quelle condivise dagli altri docenti + tutte se super_admin
DROP POLICY IF EXISTS "dql_select" ON docente_question_library;
CREATE POLICY "dql_select" ON docente_question_library
  FOR SELECT USING (
    created_by = auth.uid()
    OR is_shared = TRUE
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "dql_insert" ON docente_question_library;
CREATE POLICY "dql_insert" ON docente_question_library
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('docente', 'super_admin'))
  );

DROP POLICY IF EXISTS "dql_update" ON docente_question_library;
CREATE POLICY "dql_update" ON docente_question_library
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "dql_delete" ON docente_question_library;
CREATE POLICY "dql_delete" ON docente_question_library
  FOR DELETE USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "dqlo_select" ON docente_question_library_options;
CREATE POLICY "dqlo_select" ON docente_question_library_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM docente_question_library dql
      WHERE dql.id = question_id
        AND (dql.created_by = auth.uid() OR dql.is_shared = TRUE
             OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'))
    )
  );

DROP POLICY IF EXISTS "dqlo_insert" ON docente_question_library_options;
CREATE POLICY "dqlo_insert" ON docente_question_library_options
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM docente_question_library WHERE id = question_id AND created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "dqlo_delete" ON docente_question_library_options;
CREATE POLICY "dqlo_delete" ON docente_question_library_options
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM docente_question_library WHERE id = question_id AND created_by = auth.uid()
    )
  );

-- ============================================================
-- MIGRAZIONE 13 — Archivio domande (question_library)
-- ============================================================

-- Tabella principale domande della libreria
CREATE TABLE IF NOT EXISTS question_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  category TEXT,
  difficulty TEXT DEFAULT 'medio',
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Opzioni delle domande della libreria
CREATE TABLE IF NOT EXISTS question_library_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES question_library(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- RLS: solo super_admin può leggere/scrivere la libreria
ALTER TABLE question_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_library_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ql_select" ON question_library;
CREATE POLICY "ql_select" ON question_library
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'docente')
  );

DROP POLICY IF EXISTS "ql_insert" ON question_library;
CREATE POLICY "ql_insert" ON question_library
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "ql_delete" ON question_library;
CREATE POLICY "ql_delete" ON question_library
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "qlo_select" ON question_library_options;
CREATE POLICY "qlo_select" ON question_library_options
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'docente'))
  );

DROP POLICY IF EXISTS "qlo_insert" ON question_library_options;
CREATE POLICY "qlo_insert" ON question_library_options
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "qlo_delete" ON question_library_options;
CREATE POLICY "qlo_delete" ON question_library_options
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================
-- Migration 16: campi quiz avanzati (categoria, istruzioni, shuffle, finestre disponibilità)
-- ============================================================
ALTER TABLE course_quizzes ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE course_quizzes ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE course_quizzes ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT FALSE;
ALTER TABLE course_quizzes ADD COLUMN IF NOT EXISTS available_from TIMESTAMPTZ;
ALTER TABLE course_quizzes ADD COLUMN IF NOT EXISTS available_until TIMESTAMPTZ;

-- ============================================================
-- Migration 17: Punti per domanda + Quiz pre-archiviati (paniere)
-- ============================================================
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 1;

CREATE TABLE IF NOT EXISTS quiz_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_template_questions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES quiz_templates(id) ON DELETE CASCADE NOT NULL,
  text        TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  points      INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS quiz_template_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES quiz_template_questions(id) ON DELETE CASCADE NOT NULL,
  text        TEXT NOT NULL,
  is_correct  BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0
);

ALTER TABLE quiz_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_template_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qt_select" ON quiz_templates;
CREATE POLICY "qt_select" ON quiz_templates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "qt_insert" ON quiz_templates;
CREATE POLICY "qt_insert" ON quiz_templates FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'docente'))
);

DROP POLICY IF EXISTS "qt_update" ON quiz_templates;
CREATE POLICY "qt_update" ON quiz_templates FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'docente'))
);

DROP POLICY IF EXISTS "qt_delete" ON quiz_templates;
CREATE POLICY "qt_delete" ON quiz_templates FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'docente'))
);

DROP POLICY IF EXISTS "qtq_select" ON quiz_template_questions;
CREATE POLICY "qtq_select" ON quiz_template_questions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "qtq_insert" ON quiz_template_questions;
CREATE POLICY "qtq_insert" ON quiz_template_questions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "qtq_delete" ON quiz_template_questions;
CREATE POLICY "qtq_delete" ON quiz_template_questions FOR DELETE USING (true);

DROP POLICY IF EXISTS "qtqo_select" ON quiz_template_options;
CREATE POLICY "qtqo_select" ON quiz_template_options FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "qtqo_insert" ON quiz_template_options;
CREATE POLICY "qtqo_insert" ON quiz_template_options FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "qtqo_delete" ON quiz_template_options;
CREATE POLICY "qtqo_delete" ON quiz_template_options FOR DELETE USING (true);

-- ============================================================
-- Migration 18: Auto-chiusura quiz allo scadere del timer
-- ============================================================
ALTER TABLE course_quizzes ADD COLUMN IF NOT EXISTS auto_close_on_timer BOOLEAN DEFAULT TRUE;

-- ============================================================
-- Migration 19: course_tag sui template + docenti possono inserire in libreria
-- ============================================================
ALTER TABLE quiz_templates ADD COLUMN IF NOT EXISTS course_tag TEXT;

-- Aggiorna RLS question_library: anche i docenti possono inserire domande
DROP POLICY IF EXISTS "ql_insert" ON question_library;
CREATE POLICY "ql_insert" ON question_library
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'docente'))
  );

-- ============================================================
-- Migration 20: Categorie domande (sistema + personali)
-- ============================================================
CREATE TABLE IF NOT EXISTS question_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'system', -- 'system' | 'personal'
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE question_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qcat_select" ON question_categories;
CREATE POLICY "qcat_select" ON question_categories FOR SELECT TO authenticated USING (
  scope = 'system' OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "qcat_insert" ON question_categories;
CREATE POLICY "qcat_insert" ON question_categories FOR INSERT WITH CHECK (
  (scope = 'system' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'))
  OR
  (scope = 'personal' AND created_by = auth.uid() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'docente')))
);

DROP POLICY IF EXISTS "qcat_delete" ON question_categories;
CREATE POLICY "qcat_delete" ON question_categories FOR DELETE USING (
  (scope = 'system' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'))
  OR
  (scope = 'personal' AND created_by = auth.uid())
);

-- Seed categorie di default
INSERT INTO question_categories (name, scope) VALUES
  ('Tecnica', 'system'),
  ('Tattica', 'system'),
  ('PAGS', 'system'),
  ('AdP', 'system'),
  ('Regolamento', 'system'),
  ('Preparazione Atletica', 'system'),
  ('Psicologia', 'system'),
  ('Generali', 'system')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Migration 21 — penalty_wrong + questions_per_student
-- ============================================================

ALTER TABLE quiz_templates ADD COLUMN IF NOT EXISTS penalty_wrong BOOLEAN DEFAULT FALSE;
ALTER TABLE quiz_templates ADD COLUMN IF NOT EXISTS questions_per_student INTEGER;

ALTER TABLE course_quizzes ADD COLUMN IF NOT EXISTS penalty_wrong BOOLEAN DEFAULT FALSE;
ALTER TABLE course_quizzes ADD COLUMN IF NOT EXISTS questions_per_student INTEGER;

-- ============================================================
-- Migration 22 — RLS UPDATE policy per question_library
-- ============================================================
-- Fix bug: mancava la policy UPDATE → categorie e difficoltà non venivano
-- salvate nel DB (solo nel local state). Dopo ogni refresh tornavano a null.

DROP POLICY IF EXISTS "ql_update" ON question_library;
CREATE POLICY "ql_update" ON question_library
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
