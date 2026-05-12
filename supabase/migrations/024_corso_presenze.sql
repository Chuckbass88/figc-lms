CREATE TABLE IF NOT EXISTS corso_presenze (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  corso_id    uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  student_id  uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  data        date NOT NULL,
  present     boolean NOT NULL DEFAULT true,
  note_assenza text,
  created_by  uuid REFERENCES profiles(id),
  created_at  timestamptz DEFAULT now(),
  UNIQUE(corso_id, student_id, data)
);

-- RLS
ALTER TABLE corso_presenze ENABLE ROW LEVEL SECURITY;

-- Super admin e docenti del corso leggono
CREATE POLICY "corso_presenze_read" ON corso_presenze
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin'))
    OR EXISTS (SELECT 1 FROM course_instructors WHERE course_id = corso_presenze.corso_id AND instructor_id = auth.uid())
  );

-- Super admin e docenti del corso scrivono
CREATE POLICY "corso_presenze_write" ON corso_presenze
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin'))
    OR EXISTS (SELECT 1 FROM course_instructors WHERE course_id = corso_presenze.corso_id AND instructor_id = auth.uid())
  );
