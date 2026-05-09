-- Nuovi campi courses (dipende da aree)
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS cu_number text,
  ADD COLUMN IF NOT EXISTS cu_url text,
  ADD COLUMN IF NOT EXISTS regione text,
  ADD COLUMN IF NOT EXISTS tipo_corso text CHECK (tipo_corso IN ('centrale', 'periferico')),
  ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES aree(id);

CREATE INDEX IF NOT EXISTS idx_courses_regione ON courses(regione);
CREATE INDEX IF NOT EXISTS idx_courses_tipo ON courses(tipo_corso);

-- Archivio generale
CREATE TABLE IF NOT EXISTS archivio_generale (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  tipo text CHECK (tipo IN ('PDF', 'PPTX', 'DOC', 'XLSX', 'ALTRO')),
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  corso_origine_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  area_id uuid REFERENCES aree(id) ON DELETE SET NULL,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_archivio_area ON archivio_generale(area_id);
CREATE INDEX IF NOT EXISTS idx_archivio_corso ON archivio_generale(corso_origine_id);

CREATE TABLE IF NOT EXISTS corso_archivio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archivio_id uuid NOT NULL REFERENCES archivio_generale(id) ON DELETE CASCADE,
  corso_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  abilitato boolean NOT NULL DEFAULT true,
  added_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(archivio_id, corso_id)
);

CREATE INDEX IF NOT EXISTS idx_corso_archivio_corso ON corso_archivio(corso_id);

ALTER TABLE archivio_generale ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_archivio_all" ON archivio_generale FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "admin_archivio_write" ON archivio_generale FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN admin_permissions ap ON ap.admin_user_id = p.id
    WHERE p.id = auth.uid() AND p.role = 'admin'
    AND ap.permission_key = 'archivio_globale_write' AND ap.enabled = true
  )
);
CREATE POLICY "admin_archivio_read" ON archivio_generale FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);
CREATE POLICY "docente_archivio_read" ON archivio_generale FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN docente_aree da ON da.docente_id = p.id
    WHERE p.id = auth.uid() AND p.role = 'docente'
    AND (archivio_generale.area_id = da.area_id OR archivio_generale.area_id IS NULL)
  )
);

ALTER TABLE corso_archivio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_corso_archivio_all" ON corso_archivio FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "docente_read_corso_archivio" ON corso_archivio FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM course_instructors ci
    WHERE ci.course_id = corso_archivio.corso_id AND ci.instructor_id = auth.uid()
  )
);
CREATE POLICY "docente_insert_corso_archivio" ON corso_archivio FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM course_instructors ci
    WHERE ci.course_id = corso_archivio.corso_id AND ci.instructor_id = auth.uid()
  )
);
CREATE POLICY "docente_update_corso_archivio" ON corso_archivio FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM course_instructors ci
    WHERE ci.course_id = corso_archivio.corso_id AND ci.instructor_id = auth.uid()
  )
);
CREATE POLICY "studente_read_abilitati" ON corso_archivio FOR SELECT USING (
  abilitato = true AND EXISTS (
    SELECT 1 FROM course_enrollments ce
    WHERE ce.course_id = corso_archivio.corso_id AND ce.student_id = auth.uid()
  )
);
