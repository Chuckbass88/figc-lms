-- ============================================================
-- FIGC LMS — Dati Pilota (idempotente: sicuro da rieseguire)
-- Password per tutti: Figc2024!
-- ============================================================

CREATE OR REPLACE FUNCTION create_figc_user(
  p_email     TEXT,
  p_password  TEXT,
  p_full_name TEXT,
  p_role      user_role
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Se l'utente esiste già, restituisce l'ID esistente
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF v_user_id IS NOT NULL THEN
    UPDATE profiles SET role = p_role, full_name = p_full_name WHERE id = v_user_id;
    RETURN v_user_id;
  END IF;

  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud,
    confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_full_name, 'role', p_role::text),
    FALSE, 'authenticated', 'authenticated',
    '', '', '', ''
  );
  UPDATE profiles SET role = p_role WHERE id = v_user_id;
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
DO $$
DECLARE
  v_admin  UUID;
  v_d1 UUID; v_d2 UUID; v_d3 UUID; v_d4 UUID;
  v_roma UUID; v_milano UUID;
  s1  UUID; s2  UUID; s3  UUID; s4  UUID; s5  UUID;
  s6  UUID; s7  UUID; s8  UUID; s9  UUID; s10 UUID;
  s11 UUID; s12 UUID; s13 UUID; s14 UUID; s15 UUID;
  s16 UUID; s17 UUID; s18 UUID; s19 UUID; s20 UUID;
BEGIN

  -- Admin
  v_admin := create_figc_user('admin@figclms.it', 'Figc2024!', 'Amministratore FIGC', 'super_admin');

  -- Docenti
  v_d1 := create_figc_user('marco.rossi@figclms.it',    'Figc2024!', 'Marco Rossi',    'docente');
  v_d2 := create_figc_user('laura.bianchi@figclms.it',  'Figc2024!', 'Laura Bianchi',  'docente');
  v_d3 := create_figc_user('giuseppe.verdi@figclms.it', 'Figc2024!', 'Giuseppe Verdi', 'docente');
  v_d4 := create_figc_user('elena.russo@figclms.it',    'Figc2024!', 'Elena Russo',    'docente');

  -- Corsi
  INSERT INTO courses (id, name, description, location, start_date, end_date, status)
  VALUES (gen_random_uuid(), 'Corso Roma Test',
    'Corso di formazione allenatori UEFA B — Sede di Roma.',
    'Roma — Centro Tecnico Federale', '2024-03-01', '2024-07-31', 'active')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_roma;
  IF v_roma IS NULL THEN
    SELECT id INTO v_roma FROM courses WHERE name = 'Corso Roma Test' LIMIT 1;
  END IF;

  INSERT INTO courses (id, name, description, location, start_date, end_date, status)
  VALUES (gen_random_uuid(), 'Corso Milano Test',
    'Corso di formazione allenatori UEFA B — Sede di Milano.',
    'Milano — Centro Sportivo Vismara', '2024-04-01', '2024-08-31', 'active')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_milano;
  IF v_milano IS NULL THEN
    SELECT id INTO v_milano FROM courses WHERE name = 'Corso Milano Test' LIMIT 1;
  END IF;

  -- Docenti → Corsi
  INSERT INTO course_instructors (course_id, instructor_id) VALUES
    (v_roma, v_d1),(v_roma, v_d2),(v_roma, v_d4),
    (v_milano, v_d1),(v_milano, v_d3),(v_milano, v_d4)
  ON CONFLICT DO NOTHING;

  -- Corsisti Roma
  s1  := create_figc_user('antonio.ferrari@figclms.it',    'Figc2024!', 'Antonio Ferrari',    'studente');
  s2  := create_figc_user('giovanni.esposito@figclms.it',  'Figc2024!', 'Giovanni Esposito',  'studente');
  s3  := create_figc_user('luca.romano@figclms.it',        'Figc2024!', 'Luca Romano',        'studente');
  s4  := create_figc_user('matteo.ricci@figclms.it',       'Figc2024!', 'Matteo Ricci',       'studente');
  s5  := create_figc_user('francesco.colombo@figclms.it',  'Figc2024!', 'Francesco Colombo',  'studente');
  s6  := create_figc_user('alessandro.mancini@figclms.it', 'Figc2024!', 'Alessandro Mancini', 'studente');
  s7  := create_figc_user('stefano.greco@figclms.it',      'Figc2024!', 'Stefano Greco',      'studente');
  s8  := create_figc_user('roberto.conti@figclms.it',      'Figc2024!', 'Roberto Conti',      'studente');
  s9  := create_figc_user('andrea.martini@figclms.it',     'Figc2024!', 'Andrea Martini',     'studente');
  s10 := create_figc_user('davide.gallo@figclms.it',       'Figc2024!', 'Davide Gallo',       'studente');

  -- Corsisti Milano
  s11 := create_figc_user('simone.costa@figclms.it',       'Figc2024!', 'Simone Costa',       'studente');
  s12 := create_figc_user('emanuele.barbieri@figclms.it',  'Figc2024!', 'Emanuele Barbieri',  'studente');
  s13 := create_figc_user('claudio.leone@figclms.it',      'Figc2024!', 'Claudio Leone',      'studente');
  s14 := create_figc_user('massimo.serra@figclms.it',      'Figc2024!', 'Massimo Serra',      'studente');
  s15 := create_figc_user('pietro.fontana@figclms.it',     'Figc2024!', 'Pietro Fontana',     'studente');
  s16 := create_figc_user('fabio.deluca@figclms.it',       'Figc2024!', 'Fabio De Luca',      'studente');
  s17 := create_figc_user('nicola.pelli@figclms.it',       'Figc2024!', 'Nicola Pelli',       'studente');
  s18 := create_figc_user('lorenzo.galli@figclms.it',      'Figc2024!', 'Lorenzo Galli',      'studente');
  s19 := create_figc_user('daniele.coppola@figclms.it',    'Figc2024!', 'Daniele Coppola',    'studente');
  s20 := create_figc_user('vincenzo.marini@figclms.it',    'Figc2024!', 'Vincenzo Marini',    'studente');

  -- Iscrizioni Roma
  INSERT INTO course_enrollments (course_id, student_id, status) VALUES
    (v_roma,s1,'active'),(v_roma,s2,'active'),(v_roma,s3,'active'),(v_roma,s4,'active'),(v_roma,s5,'active'),
    (v_roma,s6,'active'),(v_roma,s7,'active'),(v_roma,s8,'active'),(v_roma,s9,'active'),(v_roma,s10,'active')
  ON CONFLICT DO NOTHING;

  -- Iscrizioni Milano
  INSERT INTO course_enrollments (course_id, student_id, status) VALUES
    (v_milano,s11,'active'),(v_milano,s12,'active'),(v_milano,s13,'active'),(v_milano,s14,'active'),(v_milano,s15,'active'),
    (v_milano,s16,'active'),(v_milano,s17,'active'),(v_milano,s18,'active'),(v_milano,s19,'active'),(v_milano,s20,'active')
  ON CONFLICT DO NOTHING;

  -- Notifiche benvenuto (solo se lo studente non ne ha già una)
  INSERT INTO notifications (user_id, title, message)
  SELECT uid, 'Benvenuto!', msg
  FROM (VALUES
    (s1,'Sei iscritto al Corso Roma Test. Buona formazione!'),
    (s2,'Sei iscritto al Corso Roma Test. Buona formazione!'),
    (s3,'Sei iscritto al Corso Roma Test. Buona formazione!'),
    (s4,'Sei iscritto al Corso Roma Test. Buona formazione!'),
    (s5,'Sei iscritto al Corso Roma Test. Buona formazione!'),
    (s6,'Sei iscritto al Corso Roma Test. Buona formazione!'),
    (s7,'Sei iscritto al Corso Roma Test. Buona formazione!'),
    (s8,'Sei iscritto al Corso Roma Test. Buona formazione!'),
    (s9,'Sei iscritto al Corso Roma Test. Buona formazione!'),
    (s10,'Sei iscritto al Corso Roma Test. Buona formazione!'),
    (s11,'Sei iscritto al Corso Milano Test. Buona formazione!'),
    (s12,'Sei iscritto al Corso Milano Test. Buona formazione!'),
    (s13,'Sei iscritto al Corso Milano Test. Buona formazione!'),
    (s14,'Sei iscritto al Corso Milano Test. Buona formazione!'),
    (s15,'Sei iscritto al Corso Milano Test. Buona formazione!'),
    (s16,'Sei iscritto al Corso Milano Test. Buona formazione!'),
    (s17,'Sei iscritto al Corso Milano Test. Buona formazione!'),
    (s18,'Sei iscritto al Corso Milano Test. Buona formazione!'),
    (s19,'Sei iscritto al Corso Milano Test. Buona formazione!'),
    (s20,'Sei iscritto al Corso Milano Test. Buona formazione!')
  ) AS t(uid, msg)
  WHERE NOT EXISTS (
    SELECT 1 FROM notifications n WHERE n.user_id = t.uid AND n.title = 'Benvenuto!'
  );

END $$;

DROP FUNCTION IF EXISTS create_figc_user;
