import { hashToken } from './jwt';

/** Mask Aadhaar as XXXX XXXX 1234 (last 4 digits only). */
export function maskAadhaar(aadhaar: string): string {
  const digits = aadhaar.replace(/\D/g, '');
  const last4 = digits.slice(-4).padStart(4, '0');
  return `XXXX XXXX ${last4}`;
}

/** SHA-256 hash of normalized 12-digit Aadhaar for uniqueness checks. */
export function hashAadhaar(aadhaar: string): string {
  const digits = aadhaar.replace(/\D/g, '');
  return hashToken(digits);
}

export function normalizeAadhaar(aadhaar: string): string {
  return aadhaar.replace(/\D/g, '');
}
