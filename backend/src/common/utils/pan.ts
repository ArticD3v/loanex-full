import { hashToken } from './jwt';

/** Mask PAN as ABC******4F (first 3 + last 2 visible). */
export function maskPan(pan: string): string {
  const value = pan.trim().toUpperCase();
  if (value.length !== 10) {
    return '**********';
  }
  return `${value.slice(0, 3)}******${value.slice(8)}`;
}

export function hashPan(pan: string): string {
  return hashToken(pan.trim().toUpperCase());
}

export function normalizePan(pan: string): string {
  return pan.trim().toUpperCase().replace(/\s+/g, '');
}
