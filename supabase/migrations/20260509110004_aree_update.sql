-- Aggiorna/aggiunge aree disciplinari CoachLab
-- Rimuove quelle vecchie e inserisce il set corretto

DELETE FROM aree WHERE nome IN (
  'Psicologia dello Sport', 'Regolamento di Gioco',
  'Preparazione Atletica', 'Tattica', 'Medicina Sportiva'
);

INSERT INTO aree (nome, descrizione) VALUES
  ('Tecnica e Tattica',     'Fondamentali tecnici, sistemi di gioco e analisi tattica'),
  ('Metodologia',           'Metodologie di allenamento e pianificazione delle sedute'),
  ('Psicologia',            'Aspetti psicologici della performance e leadership'),
  ('Portieri',              'Tecnica specifica e allenamento del portiere'),
  ('Regolamento di Gioco',  'Regole FIFA, interpretazioni arbitrali e fair play'),
  ('Medicina',              'Medicina sportiva, prevenzione infortuni e primo soccorso'),
  ('Calcio Femminile',      'Specificità del calcio femminile e sviluppo del settore')
ON CONFLICT DO NOTHING;
