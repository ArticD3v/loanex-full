import { EmiOrderDetails } from '../../types/emiOrder';

export const MOCK_EMI_ORDERS: EmiOrderDetails[] = [
  {
    applicationId: 'EMI-APP-10001',
    orderId: 'ORD-10001',
    customerId: 'CUS-10001',
    customerName: 'Rajesh Kumar',
    productId: '1',
    productName: 'Samsung Galaxy S24 Ultra 256GB',
    amount: 124999,
    paymentType: 'EMI',
    status: 'Approved',
    orderDate: '2026-07-29',
  },
];

export function findEmiOrder(applicationId: string): EmiOrderDetails | undefined {
  return MOCK_EMI_ORDERS.find((item) => item.applicationId === applicationId);
}
