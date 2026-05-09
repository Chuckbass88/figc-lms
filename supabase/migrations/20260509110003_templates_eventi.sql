CREATE TABLE IF NOT EXISTS course_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipologia text,
  parametri jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE course_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_gestisce_templates" ON course_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "docente_legge_templates" ON course_templates FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'docente')
);

INSERT INTO course_templates (nome, tipologia, parametri) VALUES (
  'UEFA A Standard', 'UEFA A',
  '{
    "durata_giorni": 10,
    "tipo_corso": "centrale",
    "materie": [
      {"nome": "Psicologia dello Sport", "ore": 3},
      {"nome": "Regolamento di Gioco", "ore": 4},
      {"nome": "Tattica", "ore": 6},
      {"nome": "Preparazione Atletica", "ore": 4}
    ],
    "calendario": {
      "giorni_settimana": ["lun", "mar", "mer", "gio", "ven"],
      "fasce_tipo": [
        {"inizio": "09:00", "fine": "11:00", "materia": "Psicologia dello Sport"},
        {"inizio": "11:15", "fine": "13:00", "materia": "Regolamento di Gioco"},
        {"inizio": "14:00", "fine": "17:00", "materia": "Tattica"}
      ]
    }
  }'::jsonb
) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS corso_eventi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corso_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  materia text NOT NULL,
  area_id uuid REFERENCES aree(id) ON DELETE SET NULL,
  data date NOT NULL,
  ora_inizio time NOT NULL,
  ora_fine time NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corso_eventi_corso ON corso_eventi(corso_id);
CREATE INDEX IF NOT EXISTS idx_corso_eventi_data ON corso_eventi(data);

CREATE TABLE IF NOT EXISTS corso_eventi_docenti (
  evento_id uuid NOT NULL REFERENCES corso_eventi(id) ON DELETE CASCADE,
  docente_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stato text NOT NULL DEFAULT 'invitato' CHECK (stato IN ('invitato', 'confermato', 'declinato')),
  PRIMARY KEY (evento_id, docente_id)
);

CREATE INDEX IF NOT EXISTS idx_ced_docente ON corso_eventi_docenti(docente_id);

ALTER TABLE corso_eventi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_gestisce_eventi" ON corso_eventi FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "docente_legge_suoi_eventi" ON corso_eventi FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM corso_eventi_docenti ced
    WHERE ced.evento_id = corso_eventi.id AND ced.docente_id = auth.uid()
  )
);
CREATE POLICY "studente_legge_eventi_corso" ON corso_eventi FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM course_enrollments ce
    WHERE ce.course_id = corso_eventi.corso_id AND ce.student_id = auth.uid()
  )
);

ALTER TABLE corso_eventi_docenti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_gestisce_ced" ON corso_eventi_docenti FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "docente_legge_proprio_ced" ON corso_eventi_docenti FOR SELECT USING (
  docente_id = auth.uid()
);
