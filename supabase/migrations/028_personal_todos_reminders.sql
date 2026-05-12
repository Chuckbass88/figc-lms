-- Migration 028: To-do list personali e Reminder con notifica/email

CREATE TABLE IF NOT EXISTS personal_todos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title      text NOT NULL DEFAULT 'Nuova lista',
  items      jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE personal_todos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "todos_own" ON personal_todos;
CREATE POLICY "todos_own" ON personal_todos
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_personal_todos_user ON personal_todos(user_id);

-- Reminder con data/ora, tipo notifica e flag inviato
CREATE TABLE IF NOT EXISTS personal_reminders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  remind_at   timestamptz NOT NULL,
  notify_type text NOT NULL DEFAULT 'both',  -- 'email' | 'notification' | 'both'
  sent        boolean NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE personal_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reminders_own" ON personal_reminders;
CREATE POLICY "reminders_own" ON personal_reminders
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_personal_reminders_user    ON personal_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_reminders_remind  ON personal_reminders(remind_at) WHERE NOT sent;
