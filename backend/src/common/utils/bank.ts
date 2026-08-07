import { hashToken } from './jwt';

/** Mask account number keeping last 4 digits: XXXXXXXX9012 */
export function maskAccountNumber(accountNumber: string): string {
  const digits = accountNumber.replace(/\D/g, '');
  if (digits.length < 4) {
    return 'X'.repeat(Math.max(digits.length, 8));
  }
  const last4 = digits.slice(-4);
  return `${'X'.repeat(Math.max(digits.length - 4, 8))}${last4}`;
}

export function hashAccountNumber(accountNumber: string): string {
  return hashToken(accountNumber.replace(/\D/g, ''));
}

export function normalizeIfsc(ifsc: string): string {
  return ifsc.trim().toUpperCase().replace(/\s+/g, '');
}
