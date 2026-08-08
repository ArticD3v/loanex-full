import { jsonDb } from '../../../config/json-db';

export const OrderStatus = {
  PENDING: 'PENDING',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  PROCESSING: 'PROCESSING',
  PACKED: 'PACKED',
  SHIPPED: 'SHIPPED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];

const STATUS_FLOW: OrderStatusType[] = [
  OrderStatus.PENDING,
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
  // Keep PENDING visible as-is — it is a real state that awaits admin
  // confirmation. Masking it as CONFIRMED made such orders un-editable
  // because the stored status stayed PENDING (transition check fails).
  const orderStatus = rawStatus;

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

  // Real payment transaction for the order (used by receipts/invoices).
  const applicationId = order.applicationId ?? order.emi_applications?.id ?? null;
  let paymentTransaction = order.paymentTransactionId
    ? jsonDb.findOne('paymentTransaction', { id: order.paymentTransactionId })
    : null;
  if (!paymentTransaction && applicationId) {
    paymentTransaction =
      jsonDb
        .findMany('paymentTransaction', { applicationId })
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
        )
        .find((p: any) => p.paymentStatus === 'SUCCESS') ?? null;
  }

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
    // Join the REAL EMI application record (created by the verification flow)
    // instead of a synthetic stub — the stub only knew the order's own
    // totalAmount, so EMI orders (whose fulfillment row is created on
    // approval without a totalAmount) showed ₹0 amounts and no loan/EMI
    // data in My Orders, the admin list and the order detail page.
    application: (() => {
      const linked =
        order.emi_applications ??
        (order.applicationId
          ? jsonDb.findOne('emi_applications', { id: order.applicationId })
          : null);
      if (linked) return linked;
      return {
        id: order.id,
        sellingPrice: order.totalAmount ?? order.total_amount ?? order.total ?? 0,
        productName: productName,
        productImage: productImage,
        emiAmount: 0,
        tenure: 0,
      };
    })(),
    deliveryAddress,
    paymentTransaction,
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
    // Persist the real fulfillment data so receipts/tracking show what was
    // actually entered (courier, tracking no., warehouse, delivery address)
    // instead of hardcoded placeholders. Also write orderStatus — previously
    // only `status` was saved, so admin status updates never surfaced.
    const updateData: Record<string, any> = {
      status: input.status,
      orderStatus: input.status,
    };
    const fields: Array<keyof typeof input> = [
      'remarks',
      'updatedBy',
      'location',
      'courierPartner',
      'trackingNumber',
      'warehouse',
      'deliveryAddress',
    ];
    for (const field of fields) {
      const value = input[field];
      if (value !== undefined && value !== null) {
        updateData[field] = value;
      }
    }
    const updated = jsonDb.update('orders', { id: input.orderId }, updateData);
    return mapOrderRecord(updated);
  }

  nextAllowedStatus(current: OrderStatusType): OrderStatusType | null {
    const index = STATUS_FLOW.indexOf(current);
    if (index < 0 || index >= STATUS_FLOW.length - 1) return null;
    return STATUS_FLOW[index + 1];
  }

  isValidTransition(from: OrderStatusType, to: OrderStatusType): boolean {
    // Cancellation is allowed from any non-terminal state. The service layer
    // already rejects updates on CANCELLED and DELIVERED orders before this
    // check runs, so returning true here is safe.
    if (to === OrderStatus.CANCELLED) return true;
    return this.nextAllowedStatus(from) === to;
  }
}

export const orderRepository = new OrderRepository();
export { STATUS_FLOW };
