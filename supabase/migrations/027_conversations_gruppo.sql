-- Punto 6: Messaggistica WhatsApp-like
-- Aggiunge type, name, group_type, moderator_id, course_id, group_id alle conversations

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS type       text    NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS name       text,
  ADD COLUMN IF NOT EXISTS group_type text,   -- 'corso' | 'microgruppo' | 'libero'
  ADD COLUMN IF NOT EXISTS moderator_id uuid  REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS course_id  uuid    REFERENCES courses(id),
  ADD COLUMN IF NOT EXISTS group_id   uuid    REFERENCES course_groups(id),
  ADD COLUMN IF NOT EXISTS created_by uuid    REFERENCES profiles(id);

-- role del partecipante (admin = moderatore, member = membro)
ALTER TABLE conversation_participants
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';

CREATE INDEX IF NOT EXISTS idx_conversations_course ON conversations(course_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type   ON conversations(type);
