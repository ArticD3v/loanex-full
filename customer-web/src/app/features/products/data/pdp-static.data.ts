import {
  DeliveryStep,
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
