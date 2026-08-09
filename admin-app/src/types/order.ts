export type PaymentType = 'online' | 'cash' | 'emi';

/** Display labels for order payment types. */
export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  online: 'Full Payment (Online)',
  cash: 'Cash (COD)',
  emi: 'EMI',
};

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'approved'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  productId: string;
  productName: string;
  orderDate: string;
  orderAmount: number;
  quantity: number;
  sellingPrice: number;
  totalAmount: number;
  paymentType: PaymentType;
  /** Raw backend payment state — 'SUCCESS' when money has been collected. */
  paymentStatus?: 'PENDING' | 'SUCCESS' | 'PAID' | 'FAILED' | 'REFUNDED';
  status: OrderStatus;
  productImageUrl?: string;
  emiPlan?: string;
  emiAmount?: number;
  emiDuration?: string;

  // ── Live loan ledger (EMI orders) ───────────────────────────────────────
  loanStatus?: string | null;
  loanAccountNumber?: string | null;
  outstandingAmount?: number | null;
  paidEmiCount?: number;
  totalEmiCount?: number;
  downPayment?: number | null;
  loanAmount?: number | null;
  interestRate?: number | null;
  processingFee?: number | null;
  downPaymentCollected?: number;
  amountPaid?: number;
  /** Date the down-payment / payment transaction was collected. */
  transactionDate?: string | null;
  /** COD only — when cash was collected at delivery. */
  paidAtDelivery?: string | null;
  nextEmiDueDate?: string | null;
  emiPayments?: {
    emiNumber: number;
    dueDate: string | null;
    paidAt: string | null;
    principalAmount: number;
    interestAmount: number;
    amount: number;
  }[];
  /**
   * Full loan schedule — paid rows carry PAID + paidAt, upcoming rows stay
   * PENDING/OVERDUE with their due dates and amounts.
   */
  emiSchedule?: {
    emiNumber: number;
    dueDate: string | null;
    paidAt: string | null;
    principalAmount: number;
    interestAmount: number;
    amount: number;
    paymentStatus: string;
  }[];
}
