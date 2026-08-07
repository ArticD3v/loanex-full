/** Format a number as Indian Rupee currency (whole rupees, no decimals). */
export function formatInr(value: number): string {
  const rounded = Math.round(value);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded);
}
