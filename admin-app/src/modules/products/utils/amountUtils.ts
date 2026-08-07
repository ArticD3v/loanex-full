/** Parse currency/amount strings — handles commas, ₹ symbol, spaces. */
export function parseAmount(value: string | number | undefined | null): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const cleaned = String(value).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}
