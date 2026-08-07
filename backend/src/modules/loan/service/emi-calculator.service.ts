export type ScheduleRow = {
  emiNumber: number;
  dueDate: Date;
  principalAmount: number;
  interestAmount: number;
  emiAmount: number;
  remainingBalance: number;
};

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface EmiBreakdownInput {
  productPrice: number;
  downPayment: number;
  processingFee: number;
  tenureMonths: number;
  annualInterestRatePercent?: number;
}

export interface EmiBreakdown {
  productPrice: number;
  downPayment: number;
  /** Collected upfront — never financed */
  processingFee: number;
  tenureMonths: number;
  annualInterestRatePercent: number;
  loanAmount: number;
  monthlyEmi: number;
  totalEmi: number;
  totalInterest: number;
  /** Down Payment + Processing Fee */
  upfrontPayment: number;
  /** Product Price + Processing Fee (+ interest) */
  totalPayable: number;
  /** @deprecated Alias of totalEmi */
  loanTotal: number;
  /** @deprecated Alias of totalPayable */
  grandTotal: number;
}

/**
 * Canonical EMI breakdown used across the platform.
 *
 * Business rules:
 * - Processing Fee is collected upfront (never financed, never in EMI).
 * - Loan Amount = Product Price − Down Payment
 * - Monthly EMI on Loan Amount only
 * - Upfront Payment = Down Payment + Processing Fee
 * - Total Payable = Product Price + Processing Fee (+ interest)
 */
export function calculateEmiBreakdown(input: EmiBreakdownInput): EmiBreakdown {
  const productPrice = round2(Math.max(0, input.productPrice));
  const downPayment = round2(Math.min(Math.max(0, input.downPayment), productPrice));
  const processingFee = round2(Math.max(0, input.processingFee));
  const tenureMonths = Math.max(0, Math.floor(input.tenureMonths));
  const annualInterestRatePercent = Math.max(0, input.annualInterestRatePercent ?? 0);

  const loanAmount = round2(productPrice - downPayment);

  const monthlyEmi = calculateMonthlyEmi(
    loanAmount,
    annualInterestRatePercent,
    tenureMonths,
  );
  // At 0% interest, total EMI equals loan amount exactly (avoid paise drift).
  const totalEmi =
    annualInterestRatePercent === 0
      ? loanAmount
      : round2(monthlyEmi * tenureMonths);
  const totalInterest =
    annualInterestRatePercent === 0
      ? 0
      : round2(Math.max(0, totalEmi - loanAmount));

  const upfrontPayment = round2(downPayment + processingFee);
  const totalPayable = round2(productPrice + processingFee + totalInterest);

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
    loanTotal: totalEmi,
    grandTotal: totalPayable,
  };
}

export function calculateMonthlyEmi(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number,
): number {
  if (tenureMonths <= 0) return 0;
  if (principal <= 0) return 0;

  const monthlyRate = annualRatePercent / 12 / 100;
  if (monthlyRate === 0) {
    return round2(principal / tenureMonths);
  }

  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  return round2((principal * monthlyRate * factor) / (factor - 1));
}

export function buildEmiSchedule(input: {
  principal: number;
  annualRatePercent: number;
  tenureMonths: number;
  startDate: Date;
  emiAmount?: number;
}): { emiAmount: number; totalInterest: number; totalPayable: number; rows: ScheduleRow[] } {
  const tenure = Math.max(1, Math.floor(input.tenureMonths));
  const monthlyRate = input.annualRatePercent / 12 / 100;
  const emiAmount =
    input.emiAmount && input.emiAmount > 0
      ? round2(input.emiAmount)
      : calculateMonthlyEmi(input.principal, input.annualRatePercent, tenure);

  let balance = round2(input.principal);
  const rows: ScheduleRow[] = [];
  let totalInterest = 0;

  for (let i = 1; i <= tenure; i += 1) {
    const interestAmount = round2(balance * monthlyRate);
    let principalAmount = round2(emiAmount - interestAmount);
    let installment = emiAmount;

    if (i === tenure || principalAmount > balance) {
      principalAmount = round2(balance);
      installment = round2(principalAmount + interestAmount);
    }

    balance = round2(Math.max(0, balance - principalAmount));
    totalInterest = round2(totalInterest + interestAmount);

    const dueDate = new Date(input.startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    rows.push({
      emiNumber: i,
      dueDate,
      principalAmount,
      interestAmount,
      emiAmount: installment,
      remainingBalance: balance,
    });
  }

  // Loan-only total (principal + interest). Processing fee / DP are tracked separately.
  const totalPayable = round2(input.principal + totalInterest);

  return {
    emiAmount,
    totalInterest,
    totalPayable,
    rows,
  };
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}
