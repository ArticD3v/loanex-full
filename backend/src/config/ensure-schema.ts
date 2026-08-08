import { Client } from 'pg';
import { env } from './env';

let ensurePromise: Promise<void> | null = null;

const REFRESH_TOKENS_DDL = `
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "token" TEXT NOT NULL,
  "userId" VARCHAR(255),
  "expiresAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS refresh_tokens_token_idx ON public.refresh_tokens ("token");
CREATE INDEX IF NOT EXISTS refresh_tokens_userId_idx ON public.refresh_tokens ("userId");
`;

function supabaseProjectRef(): string | null {
  const match = String(env.SUPABASE_URL || '').match(/https?:\/\/([^.]+)\.supabase\.co/i);
  return match?.[1] ?? null;
}

/**
 * Resolve a usable Postgres URL. On Vercel, DATABASE_URL sometimes points at
 * 127.0.0.1 (local tunnel leftover) while Supabase REST still works — rewrite
 * that host to db.<project>.supabase.co so DDL can run.
 */
function resolvePgConnectionString(): string | null {
  const raw = String(process.env.DIRECT_URL || env.DATABASE_URL || '').trim();
  if (!raw) return null;

  const ref = supabaseProjectRef();
  if (ref && /@(127\.0\.0\.1|localhost)(:\d+)?/i.test(raw)) {
    return raw.replace(/@(127\.0\.0\.1|localhost)(:\d+)?/i, `@db.${ref}.supabase.co:5432`);
  }
  return raw;
}

/**
 * Ensure critical auth tables exist in Supabase/Postgres.
 * Safe to call repeatedly — CREATE IF NOT EXISTS.
 */
export function ensureCriticalSchema(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const connectionString = resolvePgConnectionString();
      if (!connectionString) {
        console.warn('[schema] DATABASE_URL missing — skip ensureCriticalSchema');
        return;
      }

      const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
      });

      try {
        await client.connect();
        await client.query(REFRESH_TOKENS_DDL);
        console.info('[schema] ensured public.refresh_tokens');
      } catch (err) {
        console.error('[schema] ensureCriticalSchema failed:', err);
        // Allow retry on next cold start / request.
        ensurePromise = null;
      } finally {
        try {
          await client.end();
        } catch {
          /* ignore */
        }
      }
    })();
  }
  return ensurePromise;
}
