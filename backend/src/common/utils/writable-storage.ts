import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Vercel / Lambda filesystem is read-only except /tmp. */
export function isServerlessRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

/**
 * Resolve a directory that can actually be written to.
 * Prefers process.cwd()/storage locally; falls back to os.tmpdir() on serverless.
 */
export function ensureWritableStorageDir(...segments: string[]): string {
  const candidates = [
    isServerlessRuntime()
      ? path.join(os.tmpdir(), 'loanex-storage', ...segments)
      : path.resolve(process.cwd(), 'storage', ...segments),
    path.join(os.tmpdir(), 'loanex-storage', ...segments),
  ];

  let lastError: unknown;
  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      return dir;
    } catch (err) {
      lastError = err;
      console.warn(`[storage] mkdir failed at ${dir}:`, err);
    }
  }

  throw new Error(
    `Unable to create writable storage directory (${segments.join('/')}): ${String(lastError)}`,
  );
}

/** Relative path for DB storage (portable; absolute /tmp paths are useless across invocations). */
export function toRelativeStoragePath(...segments: string[]): string {
  return path.join('storage', ...segments).replace(/\\/g, '/');
}
