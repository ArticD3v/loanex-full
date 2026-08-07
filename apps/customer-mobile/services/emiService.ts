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
 * Canonical EMI breakdown.
 * Processing fee is collected upfront and never financed / never in EMI.
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
  const annualInterestRatePercent = Math.max(0, input.annualInterestRatePercent ?? 0);

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
    annualInterestRatePercent: input.annualInterestRatePercent ?? 0,
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

  // Split loan amount across remaining instalments; last EMI absorbs rounding.
  const regularEMIAmount = roundMoney(breakdown.loanAmount / futureEMICount);
  const paidViaRegular = roundMoney(regularEMIAmount * (futureEMICount - 1));
  const finalEMIAmount = roundMoney(breakdown.loanAmount - paidViaRegular);

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
    isRounded: finalEMIAmount !== regularEMIAmount,
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
