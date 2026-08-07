import { jsonDb } from '../../../config/json-db';

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
      variants: [],
    };
  }

  findVariantForProduct(_productId: string, _variantId: string) {
    return null;
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
    items?: { productId: string; quantity: number }[];
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
    
    // Map to order items format
    const orderItems = inputItems.map((item, index) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: (products[index] as any)?.price ?? 0,
    }));

    try {
      const created = await jsonDb.insertAwaited('orders', {
        userId: input.userId,
        profileId: input.userId,
        addressId: input.addressId,
        totalAmount: input.totalAmount,
        subtotal: input.totalAmount,
        total: input.totalAmount,
        paymentMethod: input.purchaseType === 'EMI' ? 'EMI' : 'FULL_PAYMENT',
        payment_status: 'PENDING',
        status: 'PENDING',
        orderStatus: 'PENDING',
        items: orderItems,
        phone: '',
      });
      return {
        id: created.id,
        userId: input.userId,
        items: inputItems,
        productId: inputItems[0]?.productId,
        quantity: inputItems[0]?.quantity,
        purchaseType: input.purchaseType,
        addressId: input.addressId,
        totalAmount: input.totalAmount,
        status: input.status ?? CheckoutSessionStatus.CREATED,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        product: firstProduct,
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
          userId,
          items: items.map(i => ({ productId: i.productId, quantity: i.quantity, product: this.findProductById(i.productId) })),
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
}

export const checkoutRepository = new CheckoutRepository();
