import {
  DeliveryStep,
  EmiDownPaymentOption,
  EmiTenureOption,
  TrustBadge,
} from '../models/product-details.models';

export const TRUST_BADGES: TrustBadge[] = [
  {
    id: 'delivery',
    icon: 'pi pi-truck',
    title: 'Free Delivery',
    subtitle: 'Fast & Reliable',
  },
  {
    id: 'replacement',
    icon: 'pi pi-refresh',
    title: '7 Days Replacement',
    subtitle: 'No questions asked',
  },
  {
    id: 'secure',
    icon: 'pi pi-lock',
    title: 'Secure Payments',
    subtitle: '100% Safe & Secure',
  },
  {
    id: 'genuine',
    icon: 'pi pi-verified',
    title: 'Genuine Products',
    subtitle: 'Brand Authorized',
  },
];

export const DELIVERY_STEPS: DeliveryStep[] = [
  {
    id: 'confirmed',
    icon: 'pi pi-check-circle',
    label: 'Order Confirmed',
    description: 'We confirm your order instantly',
  },
  {
    id: 'packed',
    icon: 'pi pi-box',
    label: 'Packed',
    description: 'Secure packing at partner hub',
  },
  {
    id: 'out',
    icon: 'pi pi-truck',
    label: 'Out for Delivery',
    description: 'On the way to your pincode',
  },
  {
    id: 'delivered',
    icon: 'pi pi-home',
    label: 'Delivered',
    description: 'Handed over at your doorstep',
  },
];

export const EMI_TENURE_OPTIONS: EmiTenureOption[] = [
  { label: '3 Months', value: 3 },
  { label: '6 Months', value: 6 },
  { label: '9 Months', value: 9 },
  { label: '12 Months', value: 12 },
];

export const EMI_DOWN_PAYMENT_OPTIONS: EmiDownPaymentOption[] = [
  { label: '₹10,000', value: 10000 },
  { label: '₹15,000', value: 15000 },
  { label: '₹20,000', value: 20000 },
  { label: '₹25,000', value: 25000 },
];

const PROCESSING_FEE_BY_TENURE: Record<number, number> = {
  3: 800,
  6: 1500,
  9: 1800,
  12: 2100,
};

export function getProcessingFee(months: number): number {
  return PROCESSING_FEE_BY_TENURE[months] ?? 1500;
}
