import { Order, OrderItem } from '../types';
import { api } from '../lib/apiClient';

export async function getAllOrders(): Promise<Order[]> {
  try {
    const res = await api.get(`/legacy/orders`);
    return res.data;
  } catch {
    return [];
  }
}

export async function getOrdersByUser(userId: string): Promise<Order[]> {
  try {
    const res = await api.get(`/legacy/orders?user_id=${userId}`);
    return res.data;
  } catch {
    return [];
  }
}

export async function addOrder(orderData: any) { throw new Error('Not implemented for legacy proxy'); }
export async function createOrder() { throw new Error('Not implemented for legacy proxy'); }
export async function updateOrderPaymentStatus() { throw new Error('Not implemented for legacy proxy'); }
export async function updateOrderStatus() { throw new Error('Not implemented for legacy proxy'); }
export async function updateEMIStatus() { throw new Error('Not implemented for legacy proxy'); }
export async function markInstallmentPaid() { throw new Error('Not implemented for legacy proxy'); }
export async function getOrder() { throw new Error('Not implemented for legacy proxy'); }
