import { EMICalcResult } from '../types';

export interface EMICalcInput {
  sellingPrice: number;
  downPayment: number;
  downPaymentType: 'amount' | 'percentage';
  firstPaymentRule: 'down_payment' | 'emi_1';
  serviceCharge: number;
  deliveryCharge: number;
  tenure: number;
  annualInterestRatePercent?: number;
}

/**
 * Legacy constant — product EMI uses the client Excel model (0% interest).
 */
export const DEFAULT_ANNUAL_INTEREST_RATE_PERCENT = 12.5;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getDownPaymentAmount(
  price: number,
  dp: number,
  type: 'amount' | 'percentage',
): number {
  return type === 'percentage' ? roundMoney((price * dp) / 100) : roundMoney(dp);
}

export function getFirstDueDate(orderDate: Date = new Date()): Date {
  const d = new Date(orderDate);
  d.setMonth(d.getMonth() + 1);
  d.setDate(orderDate.getDate() <= 15 ? 5 : 20);
  return d;
}

/** Reducing-balance EMI; rate 0 → principal / tenure. */
export function calculateMonthlyEmi(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number,
): number {
  if (tenureMonths <= 0 || principal <= 0) return 0;
  const monthlyRate = annualRatePercent / 12 / 100;
  if (monthlyRate === 0) return roundMoney(principal / tenureMonths);
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  return roundMoney((principal * monthlyRate * factor) / (factor - 1));
}

export interface EmiBreakdown {
  productPrice: number;
  downPayment: number;
  processingFee: number;
  tenureMonths: number;
  loanAmount: number;
  monthlyEmi: number;
  totalEmi: number;
  totalInterest: number;
  upfrontPayment: number;
  totalPayable: number;
  /** @deprecated Alias of totalEmi */
  loanTotal: number;
  /** @deprecated Alias of totalPayable */
  grandTotal: number;
}

/**
 * Client Excel EMI model:
 * EMI Principal = Sale − DP + Processing Fee; Interest = 0;
 * Monthly EMI = Principal / Tenure; Total = Sale + Fee.
 */
export function calculateEmiBreakdown(input: {
  productPrice: number;
  downPayment: number;
  processingFee: number;
  tenureMonths: number;
  annualInterestRatePercent?: number;
}): EmiBreakdown {
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
    productPrice,
    downPayment,
    processingFee,
    tenureMonths,
    loanAmount,
    monthlyEmi,
    totalEmi,
    totalInterest,
    upfrontPayment,
    totalPayable,
    loanTotal: totalEmi,
    grandTotal: totalPayable,
  };
}

export function calculateEMI(input: EMICalcInput): EMICalcResult {
  const { sellingPrice, serviceCharge, deliveryCharge, firstPaymentRule } = input;
  const dpAmount = getDownPaymentAmount(
    sellingPrice,
    input.downPayment,
    input.downPaymentType,
  );
  const processingFee = roundMoney(
    Math.max(0, serviceCharge) + Math.max(0, deliveryCharge),
  );

  const breakdown = calculateEmiBreakdown({
    productPrice: sellingPrice,
    downPayment: dpAmount,
    processingFee,
    tenureMonths: input.tenure,
  });

  const futureEMICount =
    firstPaymentRule === 'emi_1'
      ? Math.max(0, input.tenure - 1)
      : input.tenure;

  if (futureEMICount <= 0) {
    return {
      tenure: input.tenure,
      totalPayable: breakdown.totalPayable,
      downPaymentAmount: breakdown.downPayment,
      balanceForEMI: breakdown.loanAmount,
      loanAmount: breakdown.loanAmount,
      loanTotal: breakdown.loanTotal,
      upfrontPayment: breakdown.upfrontPayment,
      grandTotal: breakdown.totalPayable,
      processingFee: breakdown.processingFee,
      futureEMICount: 0,
      regularEMIAmount: 0,
      finalEMIAmount: 0,
      firstDueDate: getFirstDueDate(),
      isRounded: false,
    };
  }

  // Use reducing-balance EMI (not flat loanAmount / months).
  const regularEMIAmount = breakdown.monthlyEmi;
  const finalEMIAmount = breakdown.monthlyEmi;

  return {
    tenure: input.tenure,
    totalPayable: breakdown.totalPayable,
    downPaymentAmount: breakdown.downPayment,
    balanceForEMI: breakdown.loanAmount,
    loanAmount: breakdown.loanAmount,
    loanTotal: breakdown.loanTotal,
    upfrontPayment: breakdown.upfrontPayment,
    grandTotal: breakdown.totalPayable,
    processingFee: breakdown.processingFee,
    futureEMICount,
    regularEMIAmount,
    finalEMIAmount,
    firstDueDate: getFirstDueDate(),
    isRounded: false,
  };
}

export function calculateAllTenures(
  sellingPrice: number,
  downPayment: number,
  downPaymentType: 'amount' | 'percentage',
  firstPaymentRule: 'down_payment' | 'emi_1',
  serviceCharge: number,
  deliveryCharge: number,
  tenureOptions: number[],
): EMICalcResult[] {
  return tenureOptions.map((tenure) =>
    calculateEMI({
      sellingPrice,
      downPayment,
      downPaymentType,
      firstPaymentRule,
      serviceCharge,
      deliveryCharge,
      tenure,
    }),
  );
}

export function generateSchedule(calc: EMICalcResult) {
  return Array.from({ length: calc.futureEMICount }, (_, i) => {
    const d = new Date(calc.firstDueDate);
    d.setMonth(d.getMonth() + i);
    return {
      installmentNumber: i + 1,
      amount: i === calc.futureEMICount - 1 ? calc.finalEMIAmount : calc.regularEMIAmount,
      dueDate: d.toISOString(),
      status: 'upcoming' as const,
    };
  });
}
