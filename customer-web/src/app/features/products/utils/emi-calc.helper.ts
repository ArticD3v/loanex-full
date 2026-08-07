import { getProcessingFee } from '../data/pdp-static.data';
import { EmiPlanCard, EmiPlanSummary, ProductEmiPlan } from '../models/product-details.models';

export function buildEmiPlans(
  productPrice: number,
  downPayment: number,
  dbPlans: ProductEmiPlan[] = []
): EmiPlanCard[] {
  if (dbPlans && dbPlans.length > 0) {
    return dbPlans.map((plan) => {
      // In a real scenario, calculation logic depends on how admin defines it.
      // If admin specifies interestRate, it should be calculated.
      const financed = Math.max(productPrice - plan.downPayment, 0);
      const monthlyEmi = Math.round((financed + plan.serviceCharge + plan.deliveryCharge) / plan.months);
      const totalPayable = plan.downPayment + monthlyEmi * plan.months;

      return {
        months: plan.months,
        monthlyEmi,
        processingFee: plan.serviceCharge, // using serviceCharge for the UI 'processingFee' display
        downPayment: plan.downPayment, // Include the dynamic down payment
        totalPayable,
        recommended: plan.isRecommended,
      };
    });
  }

  const financed = Math.max(productPrice - downPayment, 0);

  return [3, 6, 9, 12].map((months) => {
    const processingFee = getProcessingFee(months);
    const monthlyEmi = Math.round((financed + processingFee) / months);
    const totalPayable = downPayment + monthlyEmi * months;

    return {
      months,
      monthlyEmi,
      processingFee,
      downPayment, // Include down payment for display
      totalPayable,
      recommended: months === 6,
    };
  });
}

export function buildPlanSummary(
  productPrice: number,
  downPayment: number,
  plan: EmiPlanCard,
): EmiPlanSummary {
  return {
    productPrice,
    downPayment: plan.downPayment, // Display the plan's specific down payment
    processingFee: plan.processingFee,
    monthlyEmi: plan.monthlyEmi,
    totalPayable: plan.totalPayable,
  };
}
