import { jsonDb } from '../../../config/json-db';
import { decrementStockDurable } from '../../../common/utils/inventory';

// Map Prisma-style enum values to plain strings for JSON DB
export const PurchaseType = { EMI: 'EMI', DIRECT: 'DIRECT' } as const;
export const CheckoutSessionStatus = {
  CREATED: 'CREATED',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export class CheckoutRepository {
  findProductById(productId: string) {
    const product = jsonDb.findOne('products', { id: productId });
    if (!product) return null;
    // Resolve category name from categoryId
    const cat = product.categoryId ? jsonDb.findOne('categories', { id: product.categoryId }) : null;
    return {
      ...product,
      category: product.category || cat?.name || '',
      isFeatured: product.featured ?? false,
      emiStartingFrom: product.emiStartingFrom ?? null,
      // Admin stores deliveryCharges; keep both keys in sync for pricing.
      deliveryCharge:
        Number(product.deliveryCharges ?? product.deliveryCharge ?? product.wizardData?.deliveryCharges ?? 0) || 0,
      deliveryCharges:
        Number(product.deliveryCharges ?? product.deliveryCharge ?? product.wizardData?.deliveryCharges ?? 0) || 0,
      mrp: product.mrp ?? product.price ?? 0,
      sellingPrice: product.sellingPrice ?? product.discountPrice ?? product.price ?? 0,
      discountPrice: product.discountPrice ?? product.sellingPrice ?? null,
      // Carry the real variants so a selected variant can be priced correctly
      // at checkout (previously hardcoded to [] so variant selection always
      // fell back to the default / errored).
      variants: Array.isArray(product.variants) ? product.variants : [],
    };
  }

  findVariantForProduct(productId: string, variantId: string) {
    const product = jsonDb.findOne('products', { id: productId });
    if (!product) return null;
    const variants = Array.isArray(product.variants) ? product.variants : [];
    return variants.find((row: any) => row.id === variantId) ?? null;
  }

  findProfile(userId: string) {
    return jsonDb.findOne('profiles', { id: userId });
  }

  findDefaultShippingAddress(userId: string) {
    const all = jsonDb.findMany('addresses');
    const forUser = all.filter(
      (r: any) => r.profileId === userId || r.userId === userId,
    );
    // Return default first, then most recent
    return (
      forUser.find((r: any) => r.is_default) ??
      forUser.sort((a: any, b: any) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      })[0] ??
      null
    );
  }

  findShippingAddresses(userId: string) {
    const all = jsonDb.findMany('addresses');
    const forUser = all.filter(
      (r: any) => r.profileId === userId || r.userId === userId,
    );
    return forUser.sort((a: any, b: any) => {
      // Default first, then oldest first
      if (Boolean(b.is_default) !== Boolean(a.is_default)) {
        return Boolean(b.is_default) ? 1 : -1;
      }
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb;
    });
  }

  findShippingAddressForUser(addressId: string, _userId: string) {
    return jsonDb.findOne('addresses', { id: addressId });
  }

  async createSession(input: {
    userId: string;
    items?: { productId: string; quantity: number; variantId?: string | null; unitPrice?: number }[];
    productId?: string;
    quantity?: number;
    purchaseType: string;
    addressId: string;
    totalAmount: number;
    status?: string;
  }) {
    // Determine the items array
    const inputItems = input.items && input.items.length > 0 
      ? input.items 
      : [{ productId: input.productId!, quantity: input.quantity! }];
      
    // Fetch products for all items
    const products = inputItems.map(i => this.findProductById(i.productId));
    const firstProduct = products[0];

    const baseSession = {
      id: '',
      userId: input.userId,
      items: inputItems,
      productId: inputItems[0]?.productId,
      quantity: inputItems[0]?.quantity,
      purchaseType: input.purchaseType,
      addressId: input.addressId,
      totalAmount: input.totalAmount,
      status: input.status ?? CheckoutSessionStatus.CREATED,
      createdAt: '',
      updatedAt: '',
      product: firstProduct,
    };

    // EMI sessions are only a temporary handoff to the verification flow —
    // the real order record is created by EmiApplicationService.finalizeApproval
    // (createOnApproval) once the loan is approved. Inserting an orders row
    // here left a permanent ghost PENDING order that surfaced in My Orders and
    // the admin order list alongside the real (approved) order.
    if (input.purchaseType === 'EMI') {
      return {
        ...baseSession,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Map to order items format (persist the chosen variant per item)
    const orderItems = inputItems.map((item, index) => ({
      productId: item.productId,
      quantity: item.quantity,
      variantId: (item as any).variantId ?? null,
      unitPrice:
        (item as any).unitPrice ?? (products[index] as any)?.price ?? 0,
    }));

    try {
      const created = await jsonDb.insertAwaited('orders', {
        userId: input.userId,
        profileId: input.userId,
        addressId: input.addressId,
        totalAmount: input.totalAmount,
        subtotal: input.totalAmount,
        total: input.totalAmount,
        paymentMethod: 'FULL_PAYMENT',
        payment_status: 'PENDING',
        status: 'PENDING',
        orderStatus: 'PENDING',
        items: orderItems,
        phone: '',
      });
      return {
        ...baseSession,
        id: created.id,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };
    } catch (error) {
      // Never return a fake UUID — that caused "Order not found for this account" after confirm.
      throw error;
    }
  }

  async findSessionForUser(sessionId: string, userId: string) {
    try {
      const order = jsonDb.findOne('orders', { id: sessionId });
      const ownerId = order?.userId ?? order?.user_id ?? order?.profileId ?? order?.profile_id;
      if (order && ownerId === userId) {
        const items = (order.items as any[]) ?? [];
        const productId = items[0]?.productId;
        const product = productId ? this.findProductById(productId) : null;
        return {
          id: order.id,
          orderNumber: order.orderNumber ?? null,
          userId,
          items: items.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            variantId: i.variantId ?? null,
            product: this.findProductById(i.productId),
          })),
          productId,
          quantity: items[0]?.quantity ?? 1,
          purchaseType:
            order.paymentMethod === 'EMI' ? PurchaseType.EMI : PurchaseType.DIRECT,
          addressId: order.addressId ?? order.address_id ?? '',
          totalAmount: Number(order.totalAmount ?? order.total_amount ?? order.total),
          status: order.status ?? CheckoutSessionStatus.CREATED,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          product,
          variant: null,
        };
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  async updateSessionStatus(sessionId: string, status: string) {
    try {
      await jsonDb.updateAwaited('orders', { id: sessionId }, {
        status,
        orderStatus: status,
        payment_status: status === 'CONFIRMED' || status === 'ORDER_CONFIRMED' ? 'SUCCESS' : undefined,
      });
    } catch {
      /* ignore */
    }
    return { id: sessionId, status };
  }

  /** Create a Razorpay transaction for a DIRECT (full-payment) order. */
  createDirectPaymentTransaction(input: {
    orderId: string;
    userId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
  }) {
    return jsonDb.insert('paymentTransaction', {
      orderId: input.orderId,
      userId: input.userId,
      razorpayOrderId: input.razorpayOrderId,
      amount: input.amount,
      currency: input.currency,
      paymentStatus: 'CREATED',
      paymentType: 'FULL_PAYMENT',
    });
  }

  /** Latest DIRECT transaction for an order (regardless of status). */
  findDirectPaymentForOrder(orderId: string, userId: string) {
    return (
      jsonDb
        .findMany('paymentTransaction', { userId })
        .filter(
          (t: any) => t.orderId === orderId && t.paymentType === 'FULL_PAYMENT',
        )
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
        )[0] ?? null
    );
  }

  /** A DIRECT transaction by Razorpay order id, owned by the user. */
  findDirectPaymentByRazorpayOrderId(razorpayOrderId: string, userId: string) {
    const txn = jsonDb.findOne('paymentTransaction', { razorpayOrderId });
    if (!txn || txn.userId !== userId || txn.paymentType !== 'FULL_PAYMENT') {
      return null;
    }
    return txn;
  }

  markDirectPaymentFailed(transactionId: string) {
    return jsonDb.update('paymentTransaction', { id: transactionId }, { paymentStatus: 'FAILED' });
  }

  /**
   * Mark the DIRECT transaction SUCCESS and flip the order to confirmed with a
   * real paymentTransactionId so receipts show the amount actually paid.
   */
  async completeDirectPayment(input: {
    orderId: string;
    transactionId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    orderNumber: string;
  }) {
    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 7);

    // Reduce inventory once per order — this path only runs on the first
    // successful verification (replays short-circuit on SUCCESS earlier). The
    // durable variant writes stock to Supabase directly and awaits it, so the
    // decrement survives cold starts / the source-mode catalog refresh.
    const orderRecord = jsonDb.findOne('orders', { id: input.orderId });
    await decrementStockDurable(
      ((orderRecord?.items as any[]) ?? []).map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        variantId: item.variantId ?? null,
      })),
    );

    const transaction = jsonDb.update(
      'paymentTransaction',
      { id: input.transactionId },
      {
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.razorpaySignature,
        paymentStatus: 'SUCCESS',
        paidAt: new Date().toISOString(),
      },
    );

    const order = jsonDb.update(
      'orders',
      { id: input.orderId },
      {
        orderNumber: input.orderNumber,
        paymentTransactionId: input.transactionId,
        payment_status: 'SUCCESS',
        status: 'CONFIRMED',
        orderStatus: 'ORDER_CONFIRMED',
        estimatedDeliveryDate,
      },
    );

    // Track the confirmation exactly like the EMI flow does, so the delivery
    // timeline has a real event behind it.
    const hasTracking = jsonDb.findMany('orderTracking', { orderId: input.orderId }).length;
    if (hasTracking === 0) {
      jsonDb.insert('orderTracking', {
        orderId: input.orderId,
        status: 'ORDER_CONFIRMED',
        remarks: 'Order confirmed after successful payment',
        updatedBy: 'system',
        location: order?.warehouse ?? null,
      });
    }

    return { transaction, order };
  }

  countOrdersToday(prefix: string) {
    const orders = jsonDb.findMany('orders', {});
    return orders.filter((o: any) => o.orderNumber?.startsWith(prefix)).length;
  }
}

export const checkoutRepository = new CheckoutRepository();
