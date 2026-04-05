import { createClient } from '@supabase/supabase-js'

/**
 * Client con service_role key — bypassa RLS.
 * Usare solo in API routes server-side dopo aver verificato l'utente.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
