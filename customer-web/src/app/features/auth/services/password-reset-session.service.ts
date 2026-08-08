import { Injectable } from '@angular/core';

/**
 * Holds forgot-password OTP briefly so it is never placed in the URL
 * (history, logs, referrer). Cleared after a successful read.
 */
@Injectable({ providedIn: 'root' })
export class PasswordResetSessionService {
  private otp: string | null = null;
  private mobile: string | null = null;

  set(mobile: string, otp: string): void {
    this.mobile = mobile;
    this.otp = otp;
  }

  consume(): { mobile: string; otp: string } | null {
    if (!this.mobile || !this.otp) return null;
    const value = { mobile: this.mobile, otp: this.otp };
    this.otp = null;
    return value;
  }

  peekMobile(): string | null {
    return this.mobile;
  }

  clear(): void {
    this.otp = null;
    this.mobile = null;
  }
}
