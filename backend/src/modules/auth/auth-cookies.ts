import type { CookieOptions, Request, Response } from 'express';
import { env } from '../../config/env';

export const REFRESH_COOKIE_NAME = 'loanex_refresh';

function refreshCookieMaxAgeMs(): number {
  const raw = String(env.JWT_REFRESH_EXPIRES_IN || '7d').trim();
  const match = /^(\d+)([smhd])$/i.exec(raw);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 's') return n * 1000;
  if (unit === 'm') return n * 60 * 1000;
  if (unit === 'h') return n * 60 * 60 * 1000;
  return n * 24 * 60 * 60 * 1000;
}

function cookieOptions(): CookieOptions {
  const secure = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure,
    // Cross-site SPA (customer domain → API domain) needs None+Secure in production.
    sameSite: secure ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge: refreshCookieMaxAgeMs(),
  };
}

export function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions());
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...cookieOptions(),
    maxAge: 0,
  });
}

/** Prefer body token (mobile / legacy); fall back to HttpOnly cookie. */
export function readRefreshToken(req: Request): string | undefined {
  const fromBody = (req.body as { refreshToken?: unknown } | undefined)?.refreshToken;
  if (typeof fromBody === 'string' && fromBody.trim()) {
    return fromBody.trim();
  }
  const fromCookie = req.cookies?.[REFRESH_COOKIE_NAME];
  if (typeof fromCookie === 'string' && fromCookie.trim()) {
    return fromCookie.trim();
  }
  return undefined;
}
