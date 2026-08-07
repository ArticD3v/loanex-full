import { EmiPlanCard, EmiPlanSummary, ProductEmiPlan } from '../models/product-details.models';

/** Round money to 2 decimal places (internal currency precision). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface EmiCalcInput {
  productPrice: number;
  downPayment: number;
  processingFee: number;
  tenureMonths: number;
  /** Annual interest rate percent. 0 = no interest (flat split). */
  annualInterestRatePercent?: number;
}

export interface EmiCalcResult {
  productPrice: number;
  downPayment: number;
  /** Collected upfront — never financed */
  processingFee: number;
  tenureMonths: number;
  annualInterestRatePercent: number;
  /** Product Price − Down Payment (fee excluded) */
  loanAmount: number;
  /** EMI on Loan Amount only */
  monthlyEmi: number;
  /** Sum of EMI instalments (= Loan Amount when rate is 0) */
  totalEmi: number;
  /** Interest across tenure (0 when rate is 0) */
  totalInterest: number;
  /** Down Payment + Processing Fee (charged before disbursement) */
  upfrontPayment: number;
  /**
   * Product Price + Processing Fee + Interest
   * (= Upfront Payment + Total EMI)
   */
  totalPayable: number;
  /** @deprecated Alias of totalPayable */
  grandTotal: number;
  /** @deprecated Alias of totalEmi (financed portion only) */
  loanTotal: number;
}

/**
 * Canonical EMI calculation engine.
 *
 * Business rules:
 * - Processing Fee is collected upfront (never financed).
 * - Loan Amount = Product Price − Down Payment
 * - Monthly EMI is calculated only on Loan Amount
 * - Upfront Payment = Down Payment + Processing Fee
 * - Total Payable = Product Price + Processing Fee (+ interest if any)
 */
export function calculateEmiBreakdown(input: EmiCalcInput): EmiCalcResult {
  const productPrice = roundMoney(Math.max(0, input.productPrice));
  const downPayment = roundMoney(Math.min(Math.max(0, input.downPayment), productPrice));
  const processingFee = roundMoney(Math.max(0, input.processingFee));
  const tenureMonths = Math.max(0, Math.floor(input.tenureMonths));
  const annualInterestRatePercent = Math.max(0, input.annualInterestRatePercent ?? 0);

  // Fee is never part of the financed principal.
  const loanAmount = roundMoney(productPrice - downPayment);

  const monthlyEmi = calculateMonthlyEmi(
    loanAmount,
    annualInterestRatePercent,
    tenureMonths,
  );

  // At 0% interest, total EMI equals loan amount exactly (avoid paise drift).
  const totalEmi =
    annualInterestRatePercent === 0
      ? loanAmount
      : roundMoney(monthlyEmi * tenureMonths);
  const totalInterest =
    annualInterestRatePercent === 0
      ? 0
      : roundMoney(Math.max(0, totalEmi - loanAmount));

  const upfrontPayment = roundMoney(downPayment + processingFee);
  // Product Price + Fee + Interest  ≡  Upfront + Total EMI
  const totalPayable = roundMoney(productPrice + processingFee + totalInterest);

  return {
    productPrice,
    downPayment,
    processingFee,
    tenureMonths,
    annualInterestRatePercent,
    loanAmount,
    monthlyEmi,
    totalEmi,
    totalInterest,
    upfrontPayment,
    totalPayable,
    grandTotal: totalPayable,
    loanTotal: totalEmi,
  };
}

/** Reducing-balance EMI; when rate is 0 → principal / tenure. */
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

function planProcessingFee(plan: ProductEmiPlan): number {
  return roundMoney(
    Math.max(0, plan.serviceCharge || 0) + Math.max(0, plan.deliveryCharge || 0),
  );
}

export function buildEmiPlans(
  productPrice: number,
  _downPayment: number,
  dbPlans: ProductEmiPlan[] = [],
  annualInterestRatePercent = 0,
): EmiPlanCard[] {
  if (!dbPlans?.length) return [];

  return dbPlans.map((plan) => {
    const calc = calculateEmiBreakdown({
      productPrice,
      downPayment: plan.downPayment,
      processingFee: planProcessingFee(plan),
      tenureMonths: plan.months,
      annualInterestRatePercent,
    });

    return toPlanCard(calc, plan.months, plan.isRecommended);
  });
}

function toPlanCard(
  calc: EmiCalcResult,
  months: number,
  recommended: boolean,
): EmiPlanCard {
  return {
    months,
    monthlyEmi: calc.monthlyEmi,
    processingFee: calc.processingFee,
    downPayment: calc.downPayment,
    loanAmount: calc.loanAmount,
    upfrontPayment: calc.upfrontPayment,
    totalPayable: calc.totalPayable,
    loanTotal: calc.loanTotal,
    grandTotal: calc.grandTotal,
    recommended,
  };
}

export function buildPlanSummary(
  productPrice: number,
  _downPayment: number,
  plan: EmiPlanCard,
): EmiPlanSummary {
  return {
    productPrice: roundMoney(productPrice),
    downPayment: plan.downPayment,
    processingFee: plan.processingFee,
    loanAmount: plan.loanAmount,
    monthlyEmi: plan.monthlyEmi,
    upfrontPayment: plan.upfrontPayment,
    totalPayable: plan.totalPayable,
    loanTotal: plan.loanTotal,
    grandTotal: plan.grandTotal,
  };
}
