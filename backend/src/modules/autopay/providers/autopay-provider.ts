import type {
  AutopayMandateStatus,
  AutopayPaymentMethod,
  AutopayProviderCode,
} from '@prisma/client';

export type CreateMandateProviderInput = {
  loanAccountId: string;
  loanAccountNumber: string;
  userId: string;
  paymentMethod: AutopayPaymentMethod;
  maximumDebitAmount: number;
  frequency: string;
  nextDebitDate: Date | null;
  bankName?: string | null;
  upiId?: string | null;
  /** Customer contact used by real gateways (Razorpay payment-link customer). */
  customerName?: string | null;
  customerPhone?: string | null;
  /**
   * Billing cycles for a recurring mandate (remaining EMIs). Defaults to 12.
   */
  totalCount?: number;
  /**
   * Exact amount charged per cycle. MUST be the real EMI amount — do NOT pass
   * the mandate cap (maximumDebitAmount may be EMI x 1.2 as a debit ceiling;
   * pricing the plan at the cap overcharges the customer every cycle).
   * Defaults to maximumDebitAmount when omitted.
   */
  amountPerCycle?: number;
  /**
   * First debit date for a recurring mandate. Providers must respect the
   * gateway's minimum lead time (Razorpay UPI requires >= 24h from creation).
   */
  startAt?: Date | null;
};

export type CreateMandateProviderResult = {
  provider: AutopayProviderCode;
  mandateId: string;
  mandateReference: string;
  status: AutopayMandateStatus;
  /** Customer-facing URL where the customer approves the mandate (UPI/eMandate). */
  approvalUrl?: string | null;
  raw: Record<string, unknown>;
};

export type CancelMandateProviderInput = {
  mandateId: string;
  mandateReference: string;
  providerPayload?: unknown;
};

export type CancelMandateProviderResult = {
  status: AutopayMandateStatus;
  raw: Record<string, unknown>;
};

export type MandateStatusProviderResult = {
  status: AutopayMandateStatus;
  raw: Record<string, unknown>;
};

/**
 * Provider contract for future Razorpay UPI AutoPay / eMandate / NACH integrations.
 * Business logic depends only on this interface.
 */
export interface AutopayProvider {
  readonly code: AutopayProviderCode;
  createMandate(input: CreateMandateProviderInput): Promise<CreateMandateProviderResult>;
  cancelMandate(input: CancelMandateProviderInput): Promise<CancelMandateProviderResult>;
  getMandateStatus(mandateId: string): Promise<MandateStatusProviderResult>;
}
