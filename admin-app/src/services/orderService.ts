import api from './api';
import { Order, OrderStatus, PaymentType } from '../types/order';

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface BackendOrder {
  id: string;
  userId: string;
  profileId: string;
  addressId: string;
  totalAmount: number;
  subtotal: number;
  total: number;
  // Backend mapOrderRecord emits 'FULL PAYMENT' (with space) for DIRECT orders,
  // 'EMI' for EMI orders, and could carry 'COD'/'CASH' for genuine COD sales.
  paymentMethod?: string;
  payment_status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  status: string;
  items?: OrderItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  customerMobile?: string;
  productName?: string;
  productImageUrl?: string;
  emiPlan?: string;
  emiAmount?: number;
  emiDuration?: string;
}

export interface UpdateOrderStatusData {
  status: string;
  remarks?: string;
  location?: string;
  courierPartner?: string;
  trackingNumber?: string;
  warehouse?: string;
  deliveryAddress?: string;
}

const VALID_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'approved',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

const BACKEND_TO_FRONTEND_STATUS: Record<string, OrderStatus> = {
  PENDING: 'pending',
  ORDER_CONFIRMED: 'confirmed',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  APPROVED: 'approved',
  PACKED: 'packed',
  SHIPPED: 'shipped',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

/**
 * Map raw backend order object to Frontend Order type
 */
export const mapBackendOrderToFrontend = (
  rawOrder: any,
  usersMap?: Map<string, any>,
  productsMap?: Map<string, any>
): Order => {
  const items = Array.isArray(rawOrder.items) ? rawOrder.items : [];
  const firstItem = items[0] || {};
  const product = rawOrder.product ?? {};
  const productId = rawOrder.productId || product.id || firstItem.productId || '';
  const productFromMap = productsMap?.get(productId);

  const userId = rawOrder.userId || rawOrder.profileId || rawOrder.customerId || '';
  const user = usersMap?.get(userId);

  const rawPayment = (rawOrder.paymentMethod || rawOrder.paymentType || 'FULL_PAYMENT')
    .toString()
    .toUpperCase();
  // Distinguish genuine Razorpay DIRECT (full payment online) from COD/cash.
  // Only explicit COD/CASH markers map to 'cash' — anything else non-EMI
  // (FULL_PAYMENT / FULL PAYMENT / DIRECT / ONLINE / Razorpay) is an online
  // full payment. Previously every non-EMI order was lumped into 'cash'.
  const paymentType: PaymentType =
    rawPayment === 'EMI' || rawPayment === 'EMI_PAYMENT'
      ? 'emi'
      : rawPayment === 'COD' ||
          rawPayment === 'CASH' ||
          rawPayment === 'CASH_ON_DELIVERY'
        ? 'cash'
        : 'online';

  const rawStatus = String(rawOrder.orderStatus ?? rawOrder.status ?? 'PENDING').toUpperCase();
  const status: OrderStatus = BACKEND_TO_FRONTEND_STATUS[rawStatus] ?? 'pending';

  const customerName =
    rawOrder.customerName ||
    user?.profile?.fullName ||
    user?.fullName ||
    rawOrder.customer?.fullName ||
    'Customer';

  const customerMobile =
    rawOrder.customerMobile ||
    user?.profile?.mobile_number ||
    user?.phone ||
    rawOrder.customer?.phone ||
    '';

  const productName =
    product.name ||
    rawOrder.productName ||
    productFromMap?.name ||
    firstItem.productName ||
    firstItem.product?.name ||
    'Product';

  const productImageUrl =
    product.imageUrl ||
    rawOrder.productImageUrl ||
    productFromMap?.image ||
    firstItem.productImageUrl ||
    firstItem.product?.imageUrl ||
    undefined;

  const totalAmount =
    rawOrder.orderAmount ??
    rawOrder.totalAmount ??
    rawOrder.total ??
    (firstItem.unitPrice ? firstItem.unitPrice * (firstItem.quantity || 1) : 0);

  const quantity = rawOrder.quantity ?? firstItem.quantity ?? 1;

  const sellingPrice =
    rawOrder.sellingPrice ??
    firstItem.unitPrice ??
    (quantity > 0 ? Math.round(totalAmount / quantity) : totalAmount);

  const rawOrderDate = rawOrder.orderDate ?? rawOrder.createdAt;
  const orderDate =
    rawOrderDate instanceof Date
      ? rawOrderDate.toISOString()
      : typeof rawOrderDate === 'string'
        ? rawOrderDate
        : new Date().toISOString();

  return {
    id: rawOrder.id,
    customerId: userId,
    customerName,
    customerMobile,
    productId,
    productName,
    orderDate,
    orderAmount: totalAmount,
    quantity,
    sellingPrice,
    totalAmount,
    paymentType,
    status,
    productImageUrl,
    emiPlan: rawOrder.emiPlan ?? product.name,
    emiAmount: rawOrder.emiAmount,
    emiDuration: rawOrder.emiDuration,
  };
};

/**
 * Fetch users and products maps for data enrichment
 */
const fetchEnrichmentData = async (): Promise<{
  usersMap: Map<string, any>;
  productsMap: Map<string, any>;
}> => {
  const usersMap = new Map<string, any>();
  const productsMap = new Map<string, any>();

  try {
    const [usersRes, productsRes] = await Promise.allSettled([
      api.get('/admin/users'),
      api.get('/products'),
    ]);

    if (usersRes.status === 'fulfilled' && usersRes.value.data?.data) {
      const usersList = usersRes.value.data.data;
      if (Array.isArray(usersList)) {
        usersList.forEach((u: any) => {
          if (u.id) usersMap.set(u.id, u);
        });
      }
    }

    if (productsRes.status === 'fulfilled' && productsRes.value.data?.data) {
      const pData = productsRes.value.data.data;
      const productsList = Array.isArray(pData) ? pData : pData.products || [];
      if (Array.isArray(productsList)) {
        productsList.forEach((p: any) => {
          if (p.id) productsMap.set(p.id, p);
        });
      }
    }
  } catch (err) {
    console.warn('[orderService] Optional enrichment data fetch failed:', err);
  }

  return { usersMap, productsMap };
};

/**
 * Get ALL orders (admin endpoint with fallback to user orders)
 */
export const getAllOrders = async (): Promise<Order[]> => {
  let rawOrders: any[] = [];
  try {
    const response = await api.get('/admin/orders');
    const data = response.data.data || [];
    rawOrders = Array.isArray(data) ? data : data.items || [];
  } catch (error: any) {
    if (error.status === 404) {
      console.warn('[Orders] /admin/orders not found. Using /orders fallback.');
      const response = await api.get('/orders');
      const data = response.data.data || [];
      rawOrders = Array.isArray(data) ? data : data.items || [];
    } else {
      throw error;
    }
  }

  const { usersMap, productsMap } = await fetchEnrichmentData();
  return rawOrders.map((ro) => mapBackendOrderToFrontend(ro, usersMap, productsMap));
};

/**
 * Get a single order by ID (admin-aware)
 */
export const getOrderById = async (orderId: string): Promise<Order> => {
  let rawOrder: any = null;
  try {
    // Admin detail endpoint first — the customer-scoped /orders/:orderId
    // filters by the caller's own userId and 404s for admin tokens.
    const response = await api.get(`/orders/admin/${orderId}`);
    rawOrder = response.data.data;
  } catch (error: any) {
    try {
      const response = await api.get(`/orders/${orderId}`);
      rawOrder = response.data.data;
    } catch (error2: any) {
      // Final fallback: find in the admin list.
      const all = await getAllOrders();
      const found = all.find((o) => o.id === orderId);
      if (found) return found;
      throw error2;
    }
  }

  const { usersMap, productsMap } = await fetchEnrichmentData();
  return mapBackendOrderToFrontend(rawOrder, usersMap, productsMap);
};

/**
 * Update an order's status (admin endpoint)
 */
export const updateOrderStatus = async (
  orderId: string,
  data: UpdateOrderStatusData
): Promise<Order> => {
  const response = await api.patch(`/admin/orders/${orderId}/status`, data);
  // The PATCH returns a tracking-only payload; refetch the full order so the
  // details screen isn't replaced with placeholder data.
  return getOrderById(response.data.data?.orderId ?? orderId);
};

/**
 * Get order tracking information
 */
export const getOrderTracking = async (orderId: string): Promise<any> => {
  const response = await api.get(`/orders/${orderId}/tracking`);
  return response.data.data;
};

/**
 * Download order receipt
 */
export const getOrderReceipt = async (orderId: string): Promise<any> => {
  const response = await api.get(`/orders/${orderId}/receipt`);
  return response.data.data;
};

/**
 * Download order invoice
 */
export const getOrderInvoice = async (orderId: string): Promise<any> => {
  const response = await api.get(`/orders/${orderId}/invoice`);
  return response.data.data;
};
