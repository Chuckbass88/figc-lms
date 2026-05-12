-- Punto 5: Programma corso periferico
-- Ogni giornata del programma può avere una sede diversa dal corso principale
ALTER TABLE corso_eventi ADD COLUMN IF NOT EXISTS location text;
