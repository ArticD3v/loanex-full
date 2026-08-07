import { EMIPlan } from '../types/product';
import { parseAmount } from './amountUtils';

export interface EmiRowCalculations {
  balanceAmount: number;
  totalPayable: number;
  monthlyEmi: number;
}

export function computeEmiRowCalculations(sellingPrice: number, plan: EMIPlan): EmiRowCalculations {
  const down = parseAmount(plan.downPayment);
  const service = parseAmount(plan.serviceCharge);
  const delivery = parseAmount(plan.deliveryCharge);
  const months = parseAmount(plan.months);

  const balanceAmount = Math.max(0, sellingPrice - down);
  const totalPayable = balanceAmount + service + delivery;
  const monthlyEmi = months > 0 ? totalPayable / months : 0;

  return { balanceAmount, totalPayable, monthlyEmi };
}
