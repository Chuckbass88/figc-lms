-- Aggiunge nuove materie disciplinari all'archivio generale
INSERT INTO aree (nome, descrizione) VALUES
  ('Responsabile Sett. Giov.', 'Gestione e coordinamento del settore giovanile'),
  ('Match Analysis',           'Analisi video, dati e performance delle partite'),
  ('Calcio a 5',               'Tecnica, tattica e allenamento del calcio a 5')
ON CONFLICT DO NOTHING;
