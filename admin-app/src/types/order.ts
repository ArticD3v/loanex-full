export type PaymentType = 'cash' | 'emi';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'approved'
  | 'packed'
  | 'shipped'
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
