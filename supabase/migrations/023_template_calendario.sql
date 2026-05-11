ALTER TABLE template_giorni
  ADD COLUMN IF NOT EXISTS giorno_settimana smallint,
  ADD COLUMN IF NOT EXISTS settimana_numero  smallint,
  ADD COLUMN IF NOT EXISTS is_mezza_giornata boolean DEFAULT false;

ALTER TABLE template_fasce_orarie
  ADD COLUMN IF NOT EXISTS tipo_pausa text CHECK (tipo_pausa IS NULL OR tipo_pausa IN ('caffe', 'pranzo', 'cena'));

ALTER TABLE course_templates
  ADD COLUMN IF NOT EXISTS ore_totali numeric(5,1);

-- Update struttura_tipo to allow 'calendario' mode
ALTER TABLE course_templates DROP CONSTRAINT IF EXISTS course_templates_struttura_tipo_check;
ALTER TABLE course_templates ADD CONSTRAINT course_templates_struttura_tipo_check
  CHECK (struttura_tipo IN ('giorni', 'moduli', 'calendario'));
