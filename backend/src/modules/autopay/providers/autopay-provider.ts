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
};

export type CreateMandateProviderResult = {
  provider: AutopayProviderCode;
  mandateId: string;
  mandateReference: string;
  status: AutopayMandateStatus;
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
