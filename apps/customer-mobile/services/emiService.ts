import { EMICalcResult } from '../types';

export interface EMICalcInput {
  sellingPrice: number; downPayment: number;
  downPaymentType: 'amount' | 'percentage';
  firstPaymentRule: 'down_payment' | 'emi_1';
  serviceCharge: number; deliveryCharge: number; tenure: number;
}

export function getDownPaymentAmount(price: number, dp: number, type: 'amount' | 'percentage'): number {
  return type === 'percentage' ? Math.round(price * dp / 100) : Math.round(dp);
}

export function getFirstDueDate(orderDate: Date = new Date()): Date {
  const d = new Date(orderDate);
  d.setMonth(d.getMonth() + 1);
  d.setDate(orderDate.getDate() <= 15 ? 5 : 20);
  return d;
}

export function calculateEMI(input: EMICalcInput): EMICalcResult {
  const { sellingPrice, serviceCharge, deliveryCharge, firstPaymentRule } = input;
  const dpAmount = getDownPaymentAmount(sellingPrice, input.downPayment, input.downPaymentType);
  const totalPayable = sellingPrice + serviceCharge + deliveryCharge;
  const balanceForEMI = totalPayable - dpAmount;
  const futureEMICount = firstPaymentRule === 'emi_1'
    ? Math.max(0, input.tenure - 1) : input.tenure;

  if (futureEMICount <= 0) {
    return {
      tenure: input.tenure, totalPayable, downPaymentAmount: dpAmount, balanceForEMI,
      futureEMICount: 0, regularEMIAmount: 0, finalEMIAmount: 0,
      firstDueDate: getFirstDueDate(), isRounded: false,
    };
  }
  const regularEMIAmount = Math.ceil(balanceForEMI / futureEMICount);
  const finalEMIAmount = balanceForEMI - regularEMIAmount * (futureEMICount - 1);
  return {
    tenure: input.tenure, totalPayable, downPaymentAmount: dpAmount, balanceForEMI,
    futureEMICount, regularEMIAmount, finalEMIAmount,
    firstDueDate: getFirstDueDate(), isRounded: finalEMIAmount !== regularEMIAmount,
  };
}

export function calculateAllTenures(
  sellingPrice: number, downPayment: number, downPaymentType: 'amount' | 'percentage',
  firstPaymentRule: 'down_payment' | 'emi_1', serviceCharge: number,
  deliveryCharge: number, tenureOptions: number[]
): EMICalcResult[] {
  return tenureOptions.map(tenure =>
    calculateEMI({ sellingPrice, downPayment, downPaymentType, firstPaymentRule, serviceCharge, deliveryCharge, tenure })
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
