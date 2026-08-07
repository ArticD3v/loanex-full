import { env } from '../../../config/env';
import { generateOtp, getOtpExpiryDate } from '../../../common/utils/otp';
import { hashToken } from '../../../common/utils/jwt';

export class OtpService {
  generate(length = env.OTP_LENGTH): string {
    return generateOtp(length);
  }

  hash(otp: string): string {
    return hashToken(otp);
  }

  matches(otp: string, hash: string): boolean {
    return this.hash(otp) === hash;
  }

  getExpiry(minutes: number): Date {
    return getOtpExpiryDate(minutes);
  }

  isExpired(expiresAt: Date | null | undefined): boolean {
    if (!expiresAt) return true;
    return expiresAt.getTime() <= Date.now();
  }

  /** Never logs OTP values. Dev-only destination marker without secrets. */
  logDev(label: string, destination: string): void {
    if (env.NODE_ENV !== 'production' && env.OTP_DEV_ECHO) {
      const masked =
        destination.length >= 4
          ? `******${destination.slice(-4)}`
          : '****';
      console.info(`[${label}] destination=${masked} (OTP not logged)`);
    }
  }

  /** Production never echoes OTP. Dev echo disabled by default. */
  devPayload(_otp: string): { devOtp?: string } {
    return {};
  }
}

export const otpService = new OtpService();
