import { EMIPlan } from '../types/product';
import { parseAmount } from './amountUtils';

/**
 * Legacy constant retained for any non-product callers.
 * Product EMI preview uses the client Excel model (0% interest).
 */
export const DEFAULT_ANNUAL_INTEREST_RATE_PERCENT = 12.5;

/** Round money to 2 decimal places. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface EmiCalcInput {
  productPrice: number;
  downPayment: number;
  processingFee: number;
  tenureMonths: number;
  /** Ignored — Excel product EMI is always 0% interest. */
  annualInterestRatePercent?: number;
}

export interface EmiRowCalculations {
  /** Alias of loanAmount (Amount Converted into EMI) */
  balanceAmount: number;
  /**
   * EMI Principal (Excel):
   * Sale Price − Down Payment + Service/Convenience Charge
   */
  loanAmount: number;
  monthlyEmi: number;
  totalEmi: number;
  totalInterest: number;
  processingFee: number;
  /** Down Payment only (fee recovered via EMI) */
  upfrontPayment: number;
  /** Sale Price + Service/Convenience Charge */
  totalPayable: number;
  /** @deprecated Alias of totalEmi */
  loanTotal: number;
  /** @deprecated Alias of totalPayable */
  grandTotal: number;
}

/** Principal / tenure at 0%; reducing-balance retained for rate > 0 callers. */
export function calculateMonthlyEmi(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number,
): number {
  if (tenureMonths <= 0 || principal <= 0) return 0;
  const monthlyRate = annualRatePercent / 12 / 100;
  if (monthlyRate === 0) {
    return roundMoney(principal / tenureMonths);
  }
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  return roundMoney((principal * monthlyRate * factor) / (factor - 1));
}

/**
 * Client Excel EMI model (matches backend calculateEmiBreakdown).
 *
 * EMI Principal = Sale Price − Down Payment + Processing Fee
 * Interest      = 0
 * Monthly EMI   = EMI Principal / Tenure
 * Upfront       = Down Payment
 * Total Payable = Sale Price + Processing Fee
 */
export function calculateEmiBreakdown(input: EmiCalcInput): EmiRowCalculations {
  const productPrice = roundMoney(Math.max(0, input.productPrice));
  const downPayment = roundMoney(Math.min(Math.max(0, input.downPayment), productPrice));
  const processingFee = roundMoney(Math.max(0, input.processingFee));
  const tenureMonths = Math.max(0, Math.floor(input.tenureMonths));

  const loanAmount = roundMoney(productPrice - downPayment + processingFee);
  const monthlyEmi =
    tenureMonths > 0 && loanAmount > 0 ? roundMoney(loanAmount / tenureMonths) : 0;
  const totalEmi = loanAmount;
  const totalInterest = 0;
  const upfrontPayment = downPayment;
  const totalPayable = roundMoney(productPrice + processingFee);

  return {
    balanceAmount: loanAmount,
    loanAmount,
    monthlyEmi,
    totalEmi,
    totalInterest,
    processingFee,
    upfrontPayment,
    totalPayable,
    loanTotal: totalEmi,
    grandTotal: totalPayable,
  };
}

export function computeEmiRowCalculations(sellingPrice: number, plan: EMIPlan): EmiRowCalculations {
  const down = parseAmount(plan.downPayment);
  const service = parseAmount(plan.serviceCharge);
  const delivery = parseAmount(plan.deliveryCharge);
  const months = parseAmount(plan.months);

  return calculateEmiBreakdown({
    productPrice: sellingPrice,
    downPayment: down,
    processingFee: roundMoney(service + delivery),
    tenureMonths: months,
  });
}
