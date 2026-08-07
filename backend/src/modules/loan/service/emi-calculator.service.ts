export type ScheduleRow = {
  emiNumber: number;
  dueDate: Date;
  principalAmount: number;
  interestAmount: number;
  emiAmount: number;
  remainingBalance: number;
};

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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
