import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let client: SupabaseClient | null = null;

/**
 * Optional Supabase client — used ONLY for career-resume object storage.
 * MongoDB is the single source of truth for data; there is no database
 * mirroring to Supabase anymore. Returns null when Supabase is not
 * configured, so callers degrade gracefully (e.g. local file storage).
 */
export function getSupabase(): SupabaseClient | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  if (!client) {
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
