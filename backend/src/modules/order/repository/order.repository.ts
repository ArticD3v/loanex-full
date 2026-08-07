import { jsonDb } from '../../../config/json-db';

export const OrderStatus = {
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  PROCESSING: 'PROCESSING',
  PACKED: 'PACKED',
  SHIPPED: 'SHIPPED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
} as const;

export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];

const STATUS_FLOW: OrderStatusType[] = [
  OrderStatus.ORDER_CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.PACKED,
  OrderStatus.SHIPPED,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

function orderOwnedBy(order: any, userId: string): boolean {
  if (!order || !userId) return false;
  return (
    order.userId === userId ||
    order.profileId === userId ||
    order.user_id === userId ||
    order.profile_id === userId
  );
}

function mapOrderRecord(order: any) {
  if (!order) return null;
  const items = (order.items as any[]) ?? [];
  const ownerId = order.profileId ?? order.userId ?? order.user_id ?? order.profile_id;
  const profile = jsonDb.findOne('profiles', { id: ownerId });
  const rawMethod = String(order.paymentMethod ?? order.payment_method ?? '').toUpperCase();
  const paymentMethod = order.applicationId
    ? 'EMI'
    : rawMethod === 'EMI'
      ? 'EMI'
      : 'FULL PAYMENT';
  const rawStatus = String(
    order.orderStatus ?? order.status ?? order.payment_status ?? 'CONFIRMED',
  ).toUpperCase();
  const orderStatus = (rawStatus === 'PENDING' && paymentMethod === 'FULL PAYMENT') ? 'CONFIRMED' : rawStatus;

  const productId = items[0]?.productId ?? order.productId ?? '';
  let productName = 'Product';
  let productImage = '';
  let productBrandName = '';
  if (productId) {
    const product = jsonDb.findOne('products', { id: productId });
    if (product) {
      productName = product.name;
      productImage = product.image ?? product.galleryImages?.[0] ?? '';
      productBrandName = product.brand ?? '';
    }
  }

  const address = order.addressId || order.address_id
    ? jsonDb.findOne('addresses', { id: order.addressId ?? order.address_id })
    : null;
  const deliveryAddress = address?.fullAddress ?? order.deliveryAddress ?? null;

  const populatedItems = items.map(item => {
    const p = jsonDb.findOne('products', { id: item.productId });
    return {
      ...item,
      product: p ? {
        id: p.id,
        name: p.name,
        brand: p.brand,
        imageUrl: p.image ?? p.galleryImages?.[0] ?? ''
      } : undefined
    };
  });

  return {
    ...order,
    userId: order.userId ?? order.user_id,
    profileId: order.profileId ?? order.profile_id ?? order.userId ?? order.user_id,
    items: populatedItems,
    orderNumber: order.orderNumber ?? (order.id ? `ORD-${order.id.slice(0, 8).toUpperCase()}` : 'ORD-0000'),
    applicationId: order.applicationId ?? order.emi_applications?.id ?? null,
    productId,
    productBrand: productBrandName,
    totalAmount: order.totalAmount ?? order.total_amount ?? order.total ?? 0,
    paymentMethod,
    orderStatus,
    createdAt: order.createdAt ?? order.created_at ?? new Date(),
    application: order.emi_applications ?? {
      id: order.id,
      sellingPrice: order.totalAmount ?? order.total_amount ?? order.total ?? 0,
      productName: productName,
      productImage: productImage,
      emiAmount: 0,
      tenure: 0,
    },
    deliveryAddress,
    paymentTransaction: null,
    trackingEvents: [],
    user: profile
      ? {
          id: profile.id,
          fullName: profile.fullName ?? 'Customer',
          email: profile.email ?? '',
          mobile: profile.mobileNumber ?? profile.mobile_number ?? '',
        }
      : null,
  };
}

export class OrderRepository {
  async listForUser(userId: string) {
    const orders = jsonDb.findMany('orders');
    const filtered = orders.filter((o: any) => orderOwnedBy(o, userId));
    filtered.sort((a, b) => new Date(b.createdAt ?? b.created_at).getTime() - new Date(a.createdAt ?? a.created_at).getTime());
    return filtered.map(mapOrderRecord);
  }

  async adminListAll() {
    const orders = jsonDb.findMany('orders');
    orders.sort((a, b) => new Date(b.createdAt ?? b.created_at).getTime() - new Date(a.createdAt ?? a.created_at).getTime());
    return orders.map(mapOrderRecord);
  }

  async findLatestForUser(userId: string) {
    const orders = await this.listForUser(userId);
    return orders[0] || null;
  }

  async findByIdForUser(orderId: string, userId: string) {
    const order = jsonDb.findOne('orders', { id: orderId });
    if (order && orderOwnedBy(order, userId)) {
      return mapOrderRecord(order);
    }
    return null;
  }

  async findById(orderId: string) {
    const order = jsonDb.findOne('orders', { id: orderId });
    return mapOrderRecord(order);
  }

  async findByApplicationId(applicationId: string) {
    const orders = jsonDb.findMany('orders');
    const order = orders.find((o: any) => o.applicationId === applicationId);
    return mapOrderRecord(order);
  }

  countOrdersToday(prefix: string) {
    const orders = jsonDb.findMany('orders');
    return orders.filter((o: any) => o.orderNumber && o.orderNumber.startsWith(prefix)).length;
  }

  async createOnApproval(input: {
    orderNumber: string;
    applicationId: string;
    userId: string;
    productId: string;
    productBrand?: string | null;
    deliveryAddress: string;
  }) {
    const created = await jsonDb.insertAwaited('orders', {
      userId: input.userId,
      profileId: input.userId,
      orderNumber: input.orderNumber,
      applicationId: input.applicationId,
      productId: input.productId,
      deliveryAddress: input.deliveryAddress,
      status: OrderStatus.ORDER_CONFIRMED,
      orderStatus: OrderStatus.ORDER_CONFIRMED,
      paymentMethod: 'EMI',
      items: [{ productId: input.productId, quantity: 1 }],
    });
    return mapOrderRecord(created);
  }

  updateReceiptPath(orderId: string, receiptPath: string) {
    return jsonDb.update('orders', { id: orderId }, { notes: receiptPath });
  }

  updateInvoicePath(orderId: string, invoicePath: string) {
    return jsonDb.update('orders', { id: orderId }, { notes: invoicePath });
  }

  createTrackingEvent(input: any) {
    return null;
  }

  async updateStatus(input: {
    orderId: string;
    status: OrderStatusType;
    remarks?: string | null;
    updatedBy?: string | null;
    location?: string | null;
    courierPartner?: string | null;
    trackingNumber?: string | null;
    warehouse?: string | null;
    deliveryAddress?: string | null;
  }) {
    const updated = jsonDb.update('orders', { id: input.orderId }, { status: input.status });
    return mapOrderRecord(updated);
  }

  nextAllowedStatus(current: OrderStatusType): OrderStatusType | null {
    const index = STATUS_FLOW.indexOf(current);
    if (index < 0 || index >= STATUS_FLOW.length - 1) return null;
    return STATUS_FLOW[index + 1];
  }

  isValidTransition(from: OrderStatusType, to: OrderStatusType): boolean {
    return this.nextAllowedStatus(from) === to;
  }
}

export const orderRepository = new OrderRepository();
export { STATUS_FLOW };
