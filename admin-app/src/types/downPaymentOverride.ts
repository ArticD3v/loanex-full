export type DownPaymentOverrideStatus = 'Not Overridden' | 'Overridden';

/** Customer-specific down payment override linked to an EMI application. */
export interface DownPaymentOverrideRecord {
  applicationId: string;
  /** Product-wise default down payment amount (₹). */
  defaultDownPaymentAmount: number;
  /** Final approved amount in ₹ (equals default unless overridden). */
  approvedDownPaymentAmount: number;
  overrideStatus: DownPaymentOverrideStatus;
  overrideReason: string;
  approvedBy: string;
  /** ISO date-time when override was applied; empty if not overridden. */
  overrideDateTime: string;
}

export interface ApplyDownPaymentOverrideInput {
  updatedDownPaymentAmount: number;
  overrideReason: string;
  approvedBy: string;
}
