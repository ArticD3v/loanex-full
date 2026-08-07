import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_NAME: z.string().default('LoanEx API'),
  API_PREFIX: z.string().default('/api/v1'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGINS: z
    .string()
    .default(
      'https://customer-web-beige-iota.vercel.app,https://loanex.vercel.app,https://www.loanex.in,https://loanex.in,http://localhost:4200',
    ),
  FRONTEND_URL: z.string().optional().default('https://customer-web-beige-iota.vercel.app'),
  OTP_LENGTH: z.coerce.number().default(6),
  OTP_EXPIRES_MINUTES: z.coerce.number().default(10),
  OTP_DEV_ECHO: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  OTP_MAX_RESEND: z.coerce.number().default(3),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().default(30),
  /** Authkey SMS gateway (customer OTP). */
  AUTHKEY_API_KEY: z.string().optional().default(''),
  AUTHKEY_SENDER_ID: z.string().default('LOAINP'),
  AUTHKEY_TEMPLATE_ID: z.string().default('1777178609288974856'),
  AUTHKEY_PE_ID: z.string().optional().default(''),
  AUTHKEY_SID: z.string().optional().default(''),
  AUTHKEY_COUNTRY_CODE: z.string().default('91'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900_000),
  /** Global /api budget per IP per window (production). */
  RATE_LIMIT_MAX: z.coerce.number().default(2_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(60),
  MOBILE_OTP_EXPIRES_MINUTES: z.coerce.number().default(5),
  MOBILE_OTP_MAX_RESEND: z.coerce.number().default(3),
  MOBILE_OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  MOBILE_OTP_RESEND_COOLDOWN_MS: z.coerce.number().default(30_000),
  AADHAAR_OTP_EXPIRES_MINUTES: z.coerce.number().default(5),
  AADHAAR_OTP_MAX_RESEND: z.coerce.number().default(3),
  AADHAAR_OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  AADHAAR_OTP_RESEND_COOLDOWN_MS: z.coerce.number().default(60_000),
  VERIFICATION_RATE_LIMIT_MAX: z.coerce.number().default(120),
  /** Required in production — no fallback test keys. */
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),
  RAZORPAY_CURRENCY: z.string().default('INR'),
  GST_PERCENT: z.coerce.number().default(18),
  EMI_LATE_FEE_PERCENT: z.coerce.number().default(2),
  AUTOPAY_PROVIDER: z.string().default('STUB'),
  PAYMENT_DEV_BYPASS: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /**
   * mirror  = db.json stays the boot source, every write is mirrored to Supabase.
   * source  = Supabase is the boot source of truth (required in production).
   */
  SUPABASE_SYNC_MODE: z.enum(['mirror', 'source']).default('source'),
  /** IDSPay / DigiLocker — required for Aadhaar KYC (no hardcoded fallbacks). */
  DIGILOCKER_API_ID: z.string().optional().default(''),
  DIGILOCKER_API_KEY: z.string().optional().default(''),
  DIGILOCKER_TOKEN_ID: z.string().optional().default(''),
  /**
   * Bank verification: when false/missing, bank verify fails closed
   * (no silent self-attestation success).
   */
  BANK_VERIFICATION_PROVIDER: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

if (env.NODE_ENV === 'production') {
  if (env.OTP_DEV_ECHO) {
    console.error('[SECURITY] OTP_DEV_ECHO must be false in production — forcing off');
    (env as { OTP_DEV_ECHO: boolean }).OTP_DEV_ECHO = false;
  }
  if (env.PAYMENT_DEV_BYPASS) {
    console.error('[SECURITY] PAYMENT_DEV_BYPASS must be false in production — forcing off');
    (env as { PAYMENT_DEV_BYPASS: boolean }).PAYMENT_DEV_BYPASS = false;
  }
  if (env.SUPABASE_SYNC_MODE !== 'source') {
    console.error('[SECURITY] SUPABASE_SYNC_MODE should be "source" in production');
  }
  if (!env.AUTHKEY_API_KEY?.trim()) {
    console.error('[SECURITY] AUTHKEY_API_KEY is missing — OTP send will fail closed');
  }
  if (
    env.RAZORPAY_KEY_ID.startsWith('rzp_test_') ||
    env.RAZORPAY_KEY_ID.includes('loanex_key')
  ) {
    console.warn(
      '[SECURITY] RAZORPAY_KEY_ID appears to be a test/placeholder key in production',
    );
  }
  if (
    env.JWT_ACCESS_SECRET.includes('change_me') ||
    env.JWT_REFRESH_SECRET.includes('change_me') ||
    env.JWT_ACCESS_SECRET.length < 32 ||
    env.JWT_REFRESH_SECRET.length < 32
  ) {
    console.warn('[SECURITY] Weak JWT secrets detected in production — rotate immediately');
  }
}

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .filter((origin) => {
    if (env.NODE_ENV === 'production' && /localhost|127\.0\.0\.1/i.test(origin)) {
      return false;
    }
    return true;
  });
