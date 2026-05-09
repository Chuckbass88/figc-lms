CREATE TABLE IF NOT EXISTS aree (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descrizione text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS docente_aree (
  docente_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES aree(id) ON DELETE CASCADE,
  PRIMARY KEY (docente_id, area_id)
);

CREATE INDEX IF NOT EXISTS idx_docente_aree_docente ON docente_aree(docente_id);
CREATE INDEX IF NOT EXISTS idx_docente_aree_area ON docente_aree(area_id);

ALTER TABLE aree ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tutti_leggono_aree" ON aree FOR SELECT USING (true);
CREATE POLICY "admin_gestisce_aree" ON aree FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

ALTER TABLE docente_aree ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tutti_leggono_docente_aree" ON docente_aree FOR SELECT USING (true);
CREATE POLICY "admin_gestisce_docente_aree" ON docente_aree FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

INSERT INTO aree (nome, descrizione) VALUES
  ('Psicologia dello Sport', 'Aspetti psicologici della performance'),
  ('Regolamento di Gioco', 'Regole FIFA e interpretazioni arbitrali'),
  ('Preparazione Atletica', 'Metodologie di allenamento fisico'),
  ('Tattica', 'Sistemi di gioco e analisi tattica'),
  ('Medicina Sportiva', 'Prevenzione infortuni e primo soccorso')
ON CONFLICT DO NOTHING;
