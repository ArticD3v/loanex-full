import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '../../config/env';

type RateLimiterOptions = {
  max: number;
  windowMs?: number;
  message?: Options['message'];
};

/**
 * Shared API rate limiter. Skipped in development so local SPA traffic
 * (HMR, SSR double-fetch, navigation) does not trip 429s.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  return rateLimit({
    windowMs: options.windowMs ?? env.RATE_LIMIT_WINDOW_MS,
    max: env.NODE_ENV === 'production' ? options.max : Math.max(options.max * 50, 10_000),
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'development' || env.NODE_ENV === 'test',
    message: options.message,
  });
}
