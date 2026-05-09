-- Aggiunge campi aggiuntivi al profilo utente
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS telefono         text,
  ADD COLUMN IF NOT EXISTS regione          text,
  ADD COLUMN IF NOT EXISTS contratto        text,      -- docente: 'determinato' | 'a_chiamata'
  ADD COLUMN IF NOT EXISTS categoria_corsi  text,      -- docente: 'periferico' | 'centrali' | 'entrambi'
  ADD COLUMN IF NOT EXISTS materia          text,      -- docente: materia insegnata
  ADD COLUMN IF NOT EXISTS abilitazioni     text,      -- corsista: abilitazioni UEFA/etc
  ADD COLUMN IF NOT EXISTS note_profilo     text;      -- corsista: note libere
