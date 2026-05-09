-- M2a: Aggiunge 'admin' all'enum user_role (se non già presente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'admin'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE user_role ADD VALUE 'admin';
  END IF;
END$$;

-- M2b: Crea tabella permessi granulari per admin
CREATE TABLE IF NOT EXISTS admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(admin_user_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_admin_permissions_user ON admin_permissions(admin_user_id);

ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_permissions' AND policyname = 'super_admin_manage_permissions') THEN
    CREATE POLICY "super_admin_manage_permissions" ON admin_permissions
      FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_permissions' AND policyname = 'admin_read_own_permissions') THEN
    CREATE POLICY "admin_read_own_permissions" ON admin_permissions
      FOR SELECT USING (admin_user_id = auth.uid());
  END IF;
END$$;
