import crypto from 'node:crypto';
import { env } from '../../config/env';

export function generateOtp(length = env.OTP_LENGTH): string {
  const max = 10 ** length;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(length, '0');
}

export function getOtpExpiryDate(minutes = env.OTP_EXPIRES_MINUTES): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}
