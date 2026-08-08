export type PaymentType = 'online' | 'cash' | 'emi';

/** Display labels for order payment types. */
export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  online: 'Full Payment (Online)',
  cash: 'Cash (COD)',
  emi: 'EMI',
};

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'approved'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  productId: string;
  productName: string;
  orderDate: string;
  orderAmount: number;
  quantity: number;
  sellingPrice: number;
  totalAmount: number;
  paymentType: PaymentType;
  status: OrderStatus;
  productImageUrl?: string;
  emiPlan?: string;
  emiAmount?: number;
  emiDuration?: string;
}
