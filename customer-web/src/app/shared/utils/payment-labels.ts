/**
 * Human-readable labels for order payment types, kept consistent with the
 * admin app (admin-app/src/types/order.ts: PAYMENT_TYPE_LABEL).
 */
export function paymentTypeLabel(paymentType: string | null | undefined): string {
  switch (String(paymentType ?? '').toUpperCase()) {
    case 'COD':
    case 'CASH':
    case 'CASH_ON_DELIVERY':
      return 'Cash (COD)';
    case 'FULL PAYMENT':
    case 'FULL_PAYMENT':
    case 'ONLINE':
    case 'DIRECT':
      return 'Full Payment (Online)';
    case 'EMI':
      return 'EMI';
    default:
      return paymentType || '—';
  }
}
