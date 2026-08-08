import { EMIPlan } from '../types/product';
import { parseAmount } from './amountUtils';

/** Platform default reducing-balance annual interest rate (%). */
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
  annualInterestRatePercent?: number;
}

export interface EmiRowCalculations {
  /** Alias of loanAmount (Product Price − Down Payment) */
  balanceAmount: number;
  loanAmount: number;
  monthlyEmi: number;
  totalEmi: number;
  totalInterest: number;
  processingFee: number;
  /** Down Payment + Processing Fee */
  upfrontPayment: number;
  /** Product Price + Processing Fee (+ interest) */
  totalPayable: number;
  /** @deprecated Alias of totalEmi */
  loanTotal: number;
  /** @deprecated Alias of totalPayable */
  grandTotal: number;
}

/** Reducing-balance EMI; rate 0 → principal / tenure. */
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
 * Canonical EMI breakdown — processing fee is upfront only, never financed.
 *
 * Loan Amount = Product Price − Down Payment
 * Monthly EMI = f(Loan Amount, rate, tenure)
 * Upfront Payment = Down Payment + Processing Fee
 * Total Payable = Product Price + Processing Fee (+ interest)
 */
export function calculateEmiBreakdown(input: EmiCalcInput): EmiRowCalculations {
  const productPrice = roundMoney(Math.max(0, input.productPrice));
  const downPayment = roundMoney(Math.min(Math.max(0, input.downPayment), productPrice));
  const processingFee = roundMoney(Math.max(0, input.processingFee));
  const tenureMonths = Math.max(0, Math.floor(input.tenureMonths));
  const annualInterestRatePercent = Math.max(
    0,
    input.annualInterestRatePercent ?? DEFAULT_ANNUAL_INTEREST_RATE_PERCENT,
  );

  const loanAmount = roundMoney(productPrice - downPayment);
  const monthlyEmi = calculateMonthlyEmi(
    loanAmount,
    annualInterestRatePercent,
    tenureMonths,
  );
  const totalEmi =
    annualInterestRatePercent === 0
      ? loanAmount
      : roundMoney(monthlyEmi * tenureMonths);
  const totalInterest =
    annualInterestRatePercent === 0
      ? 0
      : roundMoney(Math.max(0, totalEmi - loanAmount));

  const upfrontPayment = roundMoney(downPayment + processingFee);
  const totalPayable = roundMoney(productPrice + processingFee + totalInterest);

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
    annualInterestRatePercent: DEFAULT_ANNUAL_INTEREST_RATE_PERCENT,
  });
}
