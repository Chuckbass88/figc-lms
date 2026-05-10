-- supabase/migrations/20260511000000_template_struttura.sql

-- Estende course_templates con i nuovi campi
ALTER TABLE course_templates
  ADD COLUMN IF NOT EXISTS struttura_tipo text
    CHECK (struttura_tipo IN ('giorni', 'moduli')) DEFAULT 'giorni',
  ADD COLUMN IF NOT EXISTS materiali_tags  text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS quiz_tags       text[] DEFAULT '{}';

-- Moduli (solo per struttura_tipo = 'moduli')
CREATE TABLE IF NOT EXISTS template_moduli (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES course_templates(id) ON DELETE CASCADE,
  numero      int  NOT NULL,
  titolo      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Giorni (assoluti per 'giorni', relativi al modulo per 'moduli')
CREATE TABLE IF NOT EXISTS template_giorni (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES course_templates(id) ON DELETE CASCADE,
  modulo_id   uuid REFERENCES template_moduli(id) ON DELETE CASCADE,
  numero      int  NOT NULL,
  titolo      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Fasce orarie (sempre collegate a un giorno)
CREATE TABLE IF NOT EXISTS template_fasce_orarie (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  giorno_id   uuid NOT NULL REFERENCES template_giorni(id) ON DELETE CASCADE,
  ora_inizio  time NOT NULL,
  ora_fine    time NOT NULL,
  materia     text NOT NULL,
  area_id     uuid REFERENCES aree(id) ON DELETE SET NULL,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_template_moduli_template ON template_moduli(template_id);
CREATE INDEX IF NOT EXISTS idx_template_giorni_template ON template_giorni(template_id);
CREATE INDEX IF NOT EXISTS idx_template_giorni_modulo   ON template_giorni(modulo_id);
CREATE INDEX IF NOT EXISTS idx_template_fasce_giorno    ON template_fasce_orarie(giorno_id);

-- RLS
ALTER TABLE template_moduli        ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_giorni        ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_fasce_orarie  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_gestisce_template_moduli" ON template_moduli FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "docente_legge_template_moduli" ON template_moduli FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'docente')
);

CREATE POLICY "admin_gestisce_template_giorni" ON template_giorni FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "docente_legge_template_giorni" ON template_giorni FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'docente')
);

CREATE POLICY "admin_gestisce_template_fasce" ON template_fasce_orarie FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);
CREATE POLICY "docente_legge_template_fasce" ON template_fasce_orarie FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'docente')
);
