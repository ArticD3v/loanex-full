export type ScheduleRow = {
  emiNumber: number;
  dueDate: Date;
  principalAmount: number;
  interestAmount: number;
  emiAmount: number;
  remainingBalance: number;
};

/**
 * Legacy default used only by existing loan/approval schedule paths that still
 * accept an explicit annual rate. Product EMI display uses the Excel model (0%).
 */
export const DEFAULT_ANNUAL_INTEREST_RATE_PERCENT = 12.5;

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface EmiBreakdownInput {
  productPrice: number;
  downPayment: number;
  processingFee: number;
  tenureMonths: number;
  /** Ignored for product EMI — Excel model is always 0% interest. */
  annualInterestRatePercent?: number;
}

export interface EmiBreakdown {
  productPrice: number;
  downPayment: number;
  /** Service/convenience (+ delivery) — included in EMI principal */
  processingFee: number;
  tenureMonths: number;
  /** Always 0 for the client Excel product-EMI model */
  annualInterestRatePercent: number;
  /**
   * Amount converted into EMI (Excel):
   * Sale Price − Down Payment + Service/Convenience Charge
   */
  loanAmount: number;
  monthlyEmi: number;
  totalEmi: number;
  totalInterest: number;
  /** Down Payment only (fee is recovered via EMI instalments) */
  upfrontPayment: number;
  /** Sale Price + Service/Convenience Charge */
  totalPayable: number;
  /** @deprecated Alias of totalEmi */
  loanTotal: number;
  /** @deprecated Alias of totalPayable */
  grandTotal: number;
}

/**
 * Client Excel EMI model (authoritative for product EMI display).
 *
 * EMI Principal = Sale Price − Down Payment + Processing Fee
 * Interest      = 0
 * Monthly EMI   = EMI Principal / Tenure
 * Upfront       = Down Payment
 * Total Payable = Sale Price + Processing Fee
 *
 * Identity: Down Payment + Total EMI = Total Payable
 * (fee is NOT double-counted).
 */
export function calculateEmiBreakdown(input: EmiBreakdownInput): EmiBreakdown {
  const productPrice = round2(Math.max(0, input.productPrice));
  const downPayment = round2(Math.min(Math.max(0, input.downPayment), productPrice));
  const processingFee = round2(Math.max(0, input.processingFee));
  const tenureMonths = Math.max(0, Math.floor(input.tenureMonths));
  const annualInterestRatePercent = 0;

  const loanAmount = round2(productPrice - downPayment + processingFee);
  const monthlyEmi =
    tenureMonths > 0 && loanAmount > 0 ? round2(loanAmount / tenureMonths) : 0;
  const totalEmi = loanAmount;
  const totalInterest = 0;
  const upfrontPayment = downPayment;
  const totalPayable = round2(productPrice + processingFee);

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

/**
 * Monthly installment helper.
 * - rate 0 → principal / tenure (Excel / zero-interest)
 * - rate > 0 → reducing-balance (legacy loan/approval schedules only)
 */
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

/** Asia/Kolkata offset in minutes — EMI due dates are anchored to IST midnight. */
export const IST_OFFSET_MIN = 5 * 60 + 30;

/**
 * Truncate a date to IST midnight, returning the UTC instant of that IST
 * midnight. Timezone-agnostic — identical on IST dev machines and UTC Vercel
 * functions, so schedules and reminder windows never drift by 5:30h.
 */
export function istMidnight(date: Date): Date {
  const istWall = new Date(date.getTime() + IST_OFFSET_MIN * 60_000);
  istWall.setUTCHours(0, 0, 0, 0);
  return new Date(istWall.getTime() - IST_OFFSET_MIN * 60_000);
}
