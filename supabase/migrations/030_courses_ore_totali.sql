-- Migration 030: ore_totali su courses (soglia assenza calcolata in ore)
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS ore_totali numeric(5,1);
