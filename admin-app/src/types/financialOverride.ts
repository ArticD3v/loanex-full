export type FinancialOverrideStatus = 'Not Overridden' | 'Overridden';

/** Product-level financial defaults (mock — never mutated by Credit Review). */
export interface ProductFinancialDefaults {
  /** Default down payment amount in ₹ (same format as Product EMI plans). */
  downPaymentAmount: number;
  interestRatePercent: number;
  emiTenureMonths: number;
  processingFee: number;
  serviceCharges: number;
  otherCharges: number;
  emiPlan: string;
}

/** Customer-specific financial values linked only to one EMI application. */
export interface FinancialValues {
  downPaymentAmount: number;
  interestRatePercent: number;
  emiTenureMonths: number;
  processingFee: number;
  serviceCharges: number;
  otherCharges: number;
  emiPlan: string;
}

export interface FinancialOverrideRecord {
  applicationId: string;
  defaults: FinancialValues;
  approved: FinancialValues;
  overrideStatus: FinancialOverrideStatus;
  overrideReason: string;
  approvedBy: string;
  /** ISO date-time when override was applied; empty if not overridden. */
  overrideDateTime: string;
}

export interface ApplyFinancialOverrideInput {
  approved: FinancialValues;
  overrideReason: string;
  approvedBy: string;
}
