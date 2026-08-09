import { CheckoutSessionStatus, PurchaseType } from '../repository/checkout.repository';
type Product = any;
type ProductVariant = any;
import {
  AppError,
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors/app-error';
import { env } from '../../../config/env';
import { auditLogService } from '../../verification/service/audit-log.service';
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  getRazorpayKeyId,
  isPaymentDevBypass,
  signDevPayment,
  verifyRazorpaySignature,
} from '../../payment/service/razorpay.service';
import type { CreateCheckoutBody, PlaceOrderBody } from '../dto/checkout.dto';
import { checkoutRepository } from '../repository/checkout.repository';
import { generateSequentialOrderNumber } from '../../../common/utils/order-number';
import { decrementStockDurable } from '../../../common/utils/inventory';
import { jsonDb } from '../../../config/json-db';
import { emiApplicationService } from '../../emi-application/service/emi-application.service';
import { settingsService } from '../../settings/settings.service';

function toNumber(value: { toNumber?: () => number } | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
}

/**
 * The single source of truth for COD availability — the web summary endpoint
 * and the mobile cod-rules endpoint both derive from this.
 */
function resolveCodRules(totalAmount: number) {
  // Persisted admin setting wins; env.COD_MAX_AMOUNT is the default. This is a
  // sync in-memory read, so a settings change is live without a restart.
  const maxAmount = settingsService.getCodMaxAmount();
  return {
    maxAmount,
    codAllowed: !(maxAmount > 0 && totalAmount > maxAmount),
    totalAmount,
  };
}

function parseImages(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

function parseDiscountPercent(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const raw = String(value).trim();
  const match = raw.match(/(-?\d+(?:\.\d+)?)\s*%/);
  if (match) return Math.max(0, Number(match[1]));
  // Bare number only if it looks like a percent field (0–100) and original had %
  return 0;
}

function resolveDeliveryCharges(product: any): number {
  return (
    toNumber(product?.deliveryCharges) ||
    toNumber(product?.deliveryCharge) ||
    toNumber(product?.wizardData?.deliveryCharges) ||
    toNumber(product?.wizardData?.deliveryCharge) ||
    0
  );
}

function resolveUnitPricing(product: any, variant?: ProductVariant | null) {
  const mrp = toNumber(
    variant?.mrp ??
      variant?.price ??
      product.mrp ??
      product.price ??
      product.sellingPrice,
  );

  let unitPrice = toNumber(
    variant?.sellingPrice ??
      variant?.discountPrice ??
      product.sellingPrice ??
      product.discountPrice ??
      product.price ??
      mrp,
  );

  // Prefer explicit discounted/selling price when lower than MRP.
  const explicitDiscountPrice = variant?.discountPrice ?? product.discountPrice;
  if (explicitDiscountPrice != null && explicitDiscountPrice !== '') {
    const discounted = toNumber(explicitDiscountPrice);
    if (discounted > 0) unitPrice = discounted;
  }

  let discount = Math.max(mrp - unitPrice, 0);

  // Fallback: wizard/admin percent discount when MRP == selling price.
  if (discount <= 0) {
    const pct = parseDiscountPercent(product.discount ?? product.wizardData?.discount);
    if (pct > 0 && pct < 100 && mrp > 0) {
      discount = Math.round(((mrp * pct) / 100) * 100) / 100;
      unitPrice = Math.max(0, mrp - discount);
    }
  }

  return { mrp, unitPrice, discount };
}

function buildSummary(
  items: { product: Product; quantity: number; variant?: ProductVariant | null }[]
) {
  if (items.length === 0) throw new BadRequestError('No items to checkout');

  let totalProductPrice = 0;
  let totalDiscount = 0;
  let totalDeliveryCharges = 0;
  let isAnyOutOfStock = false;
  
  const summaryItems = items.map(item => {
    const { product, quantity, variant } = item;
    const { mrp, unitPrice, discount: unitDiscount } = resolveUnitPricing(product, variant);
    const deliveryCharges = resolveDeliveryCharges(product);
    const productPrice = unitPrice * quantity;
    const discount = unitDiscount * quantity;
    const stock = variant?.stock ?? product.stock;
    const images = variant ? parseImages(variant.images) : [];
    
    totalProductPrice += productPrice;
    totalDiscount += discount;
    totalDeliveryCharges += deliveryCharges;
    
    const inStock = (product.status === 'active' || (product as any).isActive !== false) && stock >= quantity;
    if (!inStock) isAnyOutOfStock = true;

    return {
      product: {
        id: product.id,
        name: product.name,
        brand: product.brand,
        variant: variant?.variantName ?? variant?.name ?? null,
        sku: variant?.sku ?? product.sku,
        imageUrl: images[0] ?? product.image,
        inStock,
        stockQuantity: stock,
      },
      quantity,
      pricing: {
        unitPrice,
        mrp,
        productPrice,
        discount,
        deliveryCharges,
        totalAmount: productPrice + deliveryCharges,
      },
      variantId: variant?.id,
    };
  });

  const totalAmount = totalProductPrice + totalDeliveryCharges;

  return {
    product: summaryItems[0].product, // Backward compatibility for single-product view
    quantity: summaryItems[0].quantity,
    items: summaryItems,
    pricing: {
      unitPrice: summaryItems[0].pricing.unitPrice,
      mrp: summaryItems[0].pricing.mrp,
      productPrice: totalProductPrice,
      discount: totalDiscount,
      deliveryCharges: totalDeliveryCharges,
      totalAmount,
    },
    isAnyOutOfStock,
  };
}

function resolveVariant(
  product: any,
  variantId?: string,
) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  // No sellable variants → checkout the base product. Ignore stale client variantIds
  // (common when PDP maps wizard variants but product.variants was empty).
  if (variants.length === 0) {
    return null;
  }

  const compact = (id: string) => String(id).replace(/-/g, '').toLowerCase();
  let variant: any = null;
  if (variantId) {
    const needle = String(variantId);
    variant =
      variants.find((row: any) => String(row.id) === needle) ??
      variants.find((row: any) => compact(String(row.id)) === compact(needle)) ??
      null;
  }
  if (!variant) {
    variant = variants.find((row: any) => row.isDefault) ?? variants[0] ?? null;
  }
  if (!variant) {
    throw new BadRequestError('Invalid product variant.', { code: 'INVALID_VARIANT' });
  }

  return variant;
}

import { cartRepository } from '../../cart/repository/cart.repository';

export class CheckoutService {
  /** COD cap for a given cart total — used by the mobile app's checkout. */
  getCodRules(totalAmount: number) {
    return resolveCodRules(Number.isFinite(totalAmount) ? totalAmount : 0);
  }

  async getSummary(userId: string, productId: string, quantity = 1, variantId?: string, mode: 'BUY_NOW' | 'CART' = 'BUY_NOW') {
    let checkoutItems: { product: Product; quantity: number; variant?: ProductVariant | null }[] = [];

    if (mode === 'CART') {
      const cartRows = await cartRepository.listForUser(userId);
      if (cartRows.length === 0) throw new BadRequestError('Your cart is empty.');
      checkoutItems = cartRows.map(row => ({
        product: row.product,
        quantity: row.quantity,
        variant: resolveVariant(row.product, row.variant_id)
      }));
    } else {
      const qty = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
      const product = await checkoutRepository.findProductById(productId);
      if (!product) throw new NotFoundError('Product not found.');
      const variant = resolveVariant(product, variantId);
      checkoutItems = [{ product, quantity: qty, variant }];
    }

    const profile = await checkoutRepository.findProfile(userId);
    const addresses = await checkoutRepository.findShippingAddresses(userId);
    const address = addresses.find((row) => row.isDefault) ?? addresses[0] ?? null;

    const summary = buildSummary(checkoutItems);

    const mapAddressRow = (row: any) => {
      if (!row) return null;
      const line1 = row.house_number ?? (row.fullAddress ? row.fullAddress.split(',')[0] : 'Address Line 1');
      const line2 = row.street ?? row.apartment ?? row.area ?? '';
      return {
        id: row.id,
        addressLine1: line1,
        addressLine2: line2,
        landmark: row.landmark ?? null,
        city: row.city ?? '',
        state: row.state ?? '',
        pincode: row.pincode ?? '',
        country: 'India',
        isDefault: row.is_default ?? false,
      };
    };

    return {
      ...summary,
      prerequisites: {
        profileCompleted: Boolean(profile),
        addressCompleted: addresses.length > 0,
        readyForCheckout: Boolean(profile && addresses.length > 0),
      },
      address: mapAddressRow(address),
      addresses: addresses.map(mapAddressRow),
      purchaseOptions: [
        { code: 'EMI', label: 'Buy with EMI', description: 'Pay in easy monthly instalments.' },
        { code: 'DIRECT', label: 'Buy Direct', description: 'Pay the full amount now.' },
      ],
      codRules: resolveCodRules(summary.pricing.totalAmount),
    };
  }

  async create(userId: string, input: CreateCheckoutBody) {
    const profile = await checkoutRepository.findProfile(userId);
    if (!profile) {
      throw new BadRequestError('Complete personal information before checkout.', {
        code: 'PROFILE_REQUIRED',
      });
    }

    let address = input.addressId
      ? await checkoutRepository.findShippingAddressForUser(input.addressId, userId)
      : await checkoutRepository.findDefaultShippingAddress(userId);

    if (input.addressId && !address) {
      throw new BadRequestError('Selected shipping address was not found.', {
        code: 'ADDRESS_NOT_FOUND',
      });
    }

    if (!address) {
      throw new BadRequestError('Add a shipping address before checkout.', {
        code: 'ADDRESS_REQUIRED',
      });
    }

    let checkoutItems: { product: Product; quantity: number; variant?: ProductVariant | null }[] = [];

    // Clients with a client-side cart (the mobile app) pass explicit items —
    // resolve them server-side with the same authoritative price/stock rules
    // used by place-order.
    if (input.items && input.items.length > 0) {
      for (const item of input.items) {
        const product = await checkoutRepository.findProductById(item.productId);
        if (!product) throw new NotFoundError(`Product ${item.productId} not found.`);
        const variant = item.variantId
          ? checkoutRepository.findVariantForProduct(product.id, item.variantId)
          : null;
        const variantStock = variant ? Number(variant.stock ?? 0) : null;
        const stock = variantStock ?? Number(product.stock ?? 0);
        if (stock < item.quantity) {
          throw new BadRequestError(
            `"${product.name}" is out of stock or has insufficient quantity.`,
            { code: 'OUT_OF_STOCK' },
          );
        }
        checkoutItems.push({ product, quantity: item.quantity, variant });
      }
    } else if (input.mode === 'CART') {
      const cartRows = await cartRepository.listForUser(userId);
      if (cartRows.length === 0) throw new BadRequestError('Your cart is empty.');
      checkoutItems = cartRows.map(row => ({
        product: row.product,
        quantity: row.quantity,
        variant: resolveVariant(row.product, row.variant_id)
      }));
    } else {
      const product = await checkoutRepository.findProductById(input.productId!);
      if (!product) throw new NotFoundError('Product not found.');
      const variant = resolveVariant(product, input.variantId);
      checkoutItems = [{ product, quantity: input.quantity, variant }];
    }

    const summary = buildSummary(checkoutItems);
    
    if (summary.isAnyOutOfStock) {
      throw new BadRequestError('One or more items are out of stock or have insufficient quantity.', { code: 'OUT_OF_STOCK' });
    }

    const purchaseType = input.purchaseType as keyof typeof PurchaseType;
    
    if (purchaseType === 'EMI' && checkoutItems.length > 1) {
      throw new BadRequestError('EMI is available for single products only. Multiple items require Full Payment.');
    }

    const sessionItems = summary.items.map(i => ({
      productId: i.product.id,
      quantity: i.quantity,
      variantId: i.variantId ?? null,
      // Persist the variant-adjusted unit price so the order line item (and
      // any downstream receipt/admin view) reflects the selected variant.
      unitPrice: i.pricing.unitPrice,
    }));

    const session = await checkoutRepository.createSession({
      userId,
      items: sessionItems,
      purchaseType,
      addressId: address.id,
      totalAmount: summary.pricing.totalAmount,
      status:
        purchaseType === PurchaseType.DIRECT
          ? CheckoutSessionStatus.PENDING_PAYMENT
          : CheckoutSessionStatus.CREATED,
    });

    // The cart is intentionally NOT cleared here — it stays intact until the
    // payment actually succeeds, so an abandoned checkout doesn't empty the
    // customer's cart. Purchased lines are removed at payment success.

    const redirectPath =
      purchaseType === PurchaseType.EMI ? '/verification' : '/checkout/payment';

    await auditLogService.log({
      userId,
      action: 'CHECKOUT_SESSION_CREATED',
      entity: 'checkout_sessions',
      metadata: {
        sessionId: session.id,
        purchaseType,
        totalAmount: summary.pricing.totalAmount,
        itemCount: sessionItems.length,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      session: {
        id: session.id,
        userId: session.userId,
        items: sessionItems,
        purchaseType: session.purchaseType,
        addressId: session.addressId,
        totalAmount: toNumber(session.totalAmount),
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      summary,
      redirectPath,
      nextStep: purchaseType === PurchaseType.EMI ? 'EMI_VERIFICATION' : 'DIRECT_PAYMENT',
    };
  }

  /**
   * Create a Razorpay payment order for a DIRECT (full-payment) checkout
   * session. Idempotent: reuses an existing pending transaction's order id.
   */
  /**
   * One-shot order placement for clients that bypass the session-based flow
   * (the mobile app).
   *  - COD: creates the order immediately, payment pending (pay on delivery).
   *  - DIRECT: NOT supported here — full-payment orders must go through the
   *    session flow (POST /checkout → /:sessionId/payment/order → /verify)
   *    so the Razorpay payment is verified server-side. Accepting a client-
   *    supplied razorpayPaymentId here would mint paid orders with zero
   *    verification (and the old mobile "demo_" fallback abused exactly that).
   *  - emiApplication: creates a real EMI application (no order yet — admin
   *    approval creates the fulfillment order, same as the web flow).
   */
  async placeOrder(userId: string, input: PlaceOrderBody) {
    const method = String(input.paymentMethod ?? '').toUpperCase();
    if (method === 'DIRECT' || method === 'FULL_PAYMENT') {
      throw new BadRequestError(
        'Full-payment orders must be paid through the secure checkout flow (session → payment order → verify). Please retry from checkout.',
        { code: 'DIRECT_REQUIRES_SESSION' },
      );
    }
    const profile = checkoutRepository.findProfile(userId);
    if (!profile) {
      throw new BadRequestError('Complete personal information before checkout.', {
        code: 'PROFILE_REQUIRED',
      });
    }

    let address: any = null;
    if (input.addressId) {
      address = checkoutRepository.findShippingAddressForUser(input.addressId, userId);
      if (!address) {
        throw new BadRequestError('Selected shipping address was not found.', {
          code: 'ADDRESS_NOT_FOUND',
        });
      }
    } else {
      address = checkoutRepository.findDefaultShippingAddress(userId);
    }
    const snap = input.addressSnapshot ?? null;
    const deliveryAddress =
      address?.fullAddress ??
      (snap
        ? String(
            snap.fullAddress ??
              [snap.address, snap.city, snap.state, snap.pincode]
                .filter((v) => v != null && String(v).trim() !== '')
                .join(', '),
          )
        : null) ??
      null;
    if (!deliveryAddress) {
      throw new BadRequestError('Add a shipping address before placing the order.', {
        code: 'ADDRESS_REQUIRED',
      });
    }

    // Validate items + stock (server-authoritative pricing).
    const lines: Array<{
      productId: string;
      quantity: number;
      variantId: string | null;
      unitPrice: number;
      productName: string;
      productImage: string;
    }> = [];
    for (const item of input.items) {
      const product = checkoutRepository.findProductById(item.productId);
      if (!product) throw new NotFoundError(`Product ${item.productId} not found.`);
      const variant = item.variantId
        ? checkoutRepository.findVariantForProduct(product.id, item.variantId)
        : null;
      // Server-authoritative price: the selected variant's selling price when
      // one is chosen, else the base product price.
      const unitPrice = variant
        ? toNumber(variant.sellingPrice ?? variant.price ?? product.sellingPrice ?? product.price ?? 0)
        : toNumber(product.sellingPrice ?? product.price ?? 0);
      const variantStock = variant ? Number(variant.stock ?? 0) : null;
      const stock = variantStock ?? Number(product.stock ?? 0);
      if (stock < item.quantity) {
        throw new BadRequestError(
          `"${product.name}" is out of stock or has insufficient quantity.`,
          { code: 'OUT_OF_STOCK' },
        );
      }
      lines.push({
        productId: product.id,
        quantity: item.quantity,
        variantId: variant?.id ?? null,
        unitPrice,
        productName: product.name,
        productImage: product.image ?? product.galleryImages?.[0] ?? '',
      });
    }
    const totalAmount =
      Math.round(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0) * 100) / 100;

    // ── COD rules: block cash-on-delivery above the configurable cap ───────
    const codMax = settingsService.getCodMaxAmount();
    if (input.paymentMethod !== 'DIRECT' && codMax > 0 && totalAmount > codMax) {
      const formatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(codMax);
      throw new BadRequestError(
        `Cash on Delivery is not available for orders above ${formatted}. Use full payment or EMI instead.`,
        { code: 'COD_UNAVAILABLE', maxAmount: codMax },
      );
    }

    // ── EMI application (no order yet — admin approval creates it) ──────────
    if (input.emiApplication) {
      const first = lines[0];
      const application = await emiApplicationService.create(userId, {
        productId: first.productId,
        productName: input.emiApplication.productName ?? first.productName,
        sellingPrice: first.unitPrice,
        requestedAmount: input.emiApplication.requestedAmount,
        requestedDownPayment: input.emiApplication.requestedDownPayment,
        requestedTenure: input.emiApplication.requestedTenure,
        estimatedMonthlyEmi: input.emiApplication.estimatedMonthlyEmi,
      });
      return {
        kind: 'EMI_APPLICATION' as const,
        application: {
          id: application.id,
          applicationNumber: application.applicationNumber,
          status: application.status,
        },
        items: lines,
      };
    }

    // ── COD / DIRECT order ─────────────────────────────────────────────────
    const orderNumber = generateSequentialOrderNumber();
    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 7);
    const isDirect = input.paymentMethod === 'DIRECT';

    let paymentTransactionId: string | null = null;
    if (isDirect) {
      const txn = await jsonDb.insertAwaited('paymentTransaction', {
        userId,
        orderId: null, // back-filled with the order id below
        razorpayPaymentId: input.razorpayPaymentId ?? null,
        amount: totalAmount,
        currency: 'INR',
        paymentStatus: 'SUCCESS',
        paymentType: 'FULL_PAYMENT',
      });
      paymentTransactionId = txn.id;
    }

    const storedItems = lines.map(({ productName: _pn, productImage: _pi, ...rest }) => rest);
    let order: any;
    try {
      order = await jsonDb.insertAwaited('orders', {
        orderNumber,
        userId,
        profileId: userId,
        addressId: address?.id ?? null,
        productId: lines[0].productId,
        quantity: lines[0].quantity,
        paymentTransactionId,
        orderStatus: 'ORDER_CONFIRMED',
        status: 'ORDER_CONFIRMED',
        paymentMethod: isDirect ? 'FULL_PAYMENT' : 'COD',
        payment_status: isDirect ? 'SUCCESS' : 'PENDING',
        estimatedDeliveryDate,
        deliveryAddress,
        notes: input.notes ?? null,
        items: storedItems,
        totalAmount,
        subtotal: totalAmount,
        total: totalAmount,
        phone: profile.mobileNumber ?? profile.mobile ?? profile.phone ?? '',
      });
    } catch (err: any) {
      // Concurrent placement can race on the unique orderNumber index.
      const message = String(err?.message || err || '');
      if (!(err?.code === 11000 || /E11000|duplicate key/i.test(message))) throw err;
      await jsonDb.refreshCollection('orders');
      const existing = jsonDb.findOne('orders', { orderNumber });
      if (!existing) throw err;
      order = existing;
    }

    if (paymentTransactionId && order) {
      await jsonDb.updateAwaited('paymentTransaction', { id: paymentTransactionId }, { orderId: order.id });
    }

    await decrementStockDurable(
      lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        variantId: l.variantId,
      })),
    );

    // Order placed — take the purchased quantities out of the cart. Partial
    // purchases (fewer units than the cart line holds) reduce the line
    // quantity rather than deleting the line.
    await cartRepository.removeProducts(
      userId,
      lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    );

    await auditLogService.log({
      userId,
      action: isDirect ? 'PAYMENT_SUCCESS' : 'ORDER_PLACED',
      entity: 'orders',
      metadata: {
        orderId: order.id,
        orderNumber,
        paymentMethod: input.paymentMethod,
        amount: totalAmount,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      kind: 'ORDER' as const,
      order: {
        id: order.id,
        orderNumber,
        paymentMethod: input.paymentMethod,
        paymentStatus: order.payment_status,
        orderStatus: order.orderStatus,
        totalAmount,
        estimatedDeliveryDate,
      },
      items: lines,
    };
  }

  async createPaymentOrder(userId: string, sessionId: string) {
    const session = await checkoutRepository.findSessionForUser(sessionId, userId);
    if (!session) throw new NotFoundError('Checkout session not found.');
    if (session.purchaseType !== PurchaseType.DIRECT) {
      throw new BadRequestError(
        'Payment orders are only available for DIRECT (full payment) purchases.',
      );
    }

    const existing = await checkoutRepository.findDirectPaymentForOrder(session.id, userId);
    if (existing?.paymentStatus === 'SUCCESS') {
      // AppError (not ConflictError) so the top-level `code` is ALREADY_PAID
      // in the HTTP body — the frontend redirects on that code.
      throw new AppError(
        'This order has already been paid.',
        409,
        'ALREADY_PAID',
        { nextStep: 'ORDER_CONFIRMATION' },
      );
    }
    // Reuse a live pending order (idempotent retry after a closed modal). A
    // FAILED transaction is wedged — issue a fresh Razorpay order instead.
    if (existing?.razorpayOrderId && existing?.paymentStatus !== 'FAILED') {
      return this.buildPaymentOrderResponse(session, existing.razorpayOrderId);
    }

    const amount = toNumber(session.totalAmount);
    if (amount <= 0) {
      throw new BadRequestError('Invalid order amount.', { code: 'INVALID_AMOUNT' });
    }

    const razorpayOrder = await createRazorpayOrder({
      amountInr: amount,
      receipt: `DIRECT-${session.id.slice(0, 16)}`,
      notes: { orderId: session.id, userId, paymentType: 'FULL_PAYMENT' },
    });

    await checkoutRepository.createDirectPaymentTransaction({
      orderId: session.id,
      userId,
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency: razorpayOrder.currency,
    });

    await auditLogService.log({
      userId,
      action: 'PAYMENT_ORDER_CREATED',
      entity: 'payment_transactions',
      metadata: {
        orderId: session.id,
        razorpayOrderId: razorpayOrder.id,
        amount,
        paymentType: 'FULL_PAYMENT',
        timestamp: new Date().toISOString(),
      },
    });

    return this.buildPaymentOrderResponse(session, razorpayOrder.id);
  }

  /**
   * Verify a Razorpay payment for a DIRECT checkout and complete the order
   * (marks the transaction SUCCESS, links it to the order, confirms it).
   */
  async verifyPayment(
    userId: string,
    sessionId: string,
    input: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) {
    const session = await checkoutRepository.findSessionForUser(sessionId, userId);
    if (!session) throw new NotFoundError('Checkout session not found.');
    if (session.purchaseType !== PurchaseType.DIRECT) {
      throw new BadRequestError(
        'Verification is only available for DIRECT (full payment) purchases.',
      );
    }

    const transaction = await checkoutRepository.findDirectPaymentByRazorpayOrderId(
      input.razorpayOrderId,
      userId,
    );
    if (!transaction || transaction.orderId !== sessionId) {
      throw new NotFoundError('Payment order not found for this checkout session.');
    }

    if (transaction.paymentStatus === 'SUCCESS') {
      return {
        paymentStatus: 'SUCCESS' as const,
        alreadyProcessed: true,
        orderId: session.id,
        orderNumber: session.orderNumber ?? session.id,
        nextStep: 'ORDER_CONFIRMATION' as const,
      };
    }

    const valid = verifyRazorpaySignature({
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
    });
    if (!valid) {
      await checkoutRepository.markDirectPaymentFailed(transaction.id);
      throw new BadRequestError('Payment signature verification failed.', {
        code: 'SIGNATURE_FAILED',
      });
    }

    // Server-side confirmation — never trust the frontend callback alone.
    if (!isPaymentDevBypass()) {
      const remote = await fetchRazorpayPayment(input.razorpayPaymentId);
      const okStatus = ['captured', 'authorized'].includes(
        String(remote.status).toLowerCase(),
      );
      if (!okStatus) {
        await checkoutRepository.markDirectPaymentFailed(transaction.id);
        throw new BadRequestError('Payment not captured at Razorpay.', {
          code: 'PAYMENT_NOT_CAPTURED',
          status: remote.status,
        });
      }
      if (remote.orderId && remote.orderId !== input.razorpayOrderId) {
        await checkoutRepository.markDirectPaymentFailed(transaction.id);
        throw new BadRequestError('Payment order mismatch.', { code: 'ORDER_MISMATCH' });
      }
      // Defense-in-depth: the captured amount (paise) must match what we
      // charged — catches tampering or a stale checkout quote.
      const remoteAmountPaise = Number(remote.amount);
      const expectedPaise = Math.round(toNumber(transaction.amount) * 100);
      if (Number.isFinite(remoteAmountPaise) && remoteAmountPaise !== expectedPaise) {
        await checkoutRepository.markDirectPaymentFailed(transaction.id);
        throw new BadRequestError('Payment amount mismatch.', {
          code: 'AMOUNT_MISMATCH',
        });
      }
    }

    const orderNumber = await this.generateOrderNumber();
    const result = await checkoutRepository.completeDirectPayment({
      orderId: session.id,
      transactionId: transaction.id,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
      orderNumber,
    });

    await auditLogService.log({
      userId,
      action: 'PAYMENT_SUCCESS',
      entity: 'payment_transactions',
      metadata: {
        orderId: session.id,
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        amount: toNumber(transaction.amount),
        timestamp: new Date().toISOString(),
      },
    });

    // The audit bridge dispatches the ORDER_CONFIRMED notification.
    await auditLogService.log({
      userId,
      action: 'ORDER_CONFIRMED',
      entity: 'orders',
      metadata: {
        orderId: session.id,
        orderNumber: result.order?.orderNumber ?? orderNumber,
        paymentTransactionId: transaction.id,
        timestamp: new Date().toISOString(),
      },
    });

    // Payment succeeded — remove the purchased quantities from the cart so the
    // checkout session's items are not re-bought from a stale cart. Partial
    // purchases reduce the line quantity instead of deleting the whole line.
    await cartRepository.removeProducts(
      userId,
      (session.items ?? []).map((i: any) => ({
        productId: i.productId,
        quantity: i.quantity ?? 1,
      })),
    );

    return {
      paymentStatus: 'SUCCESS' as const,
      alreadyProcessed: false,
      transactionId: transaction.id,
      orderId: session.id,
      orderNumber: result.order?.orderNumber ?? orderNumber,
      nextStep: 'ORDER_CONFIRMATION' as const,
    };
  }

  /**
   * Dev-only helper to complete a DIRECT checkout without the Razorpay UI.
   * Fabricates a payment id and HMAC signature exactly like the EMI flow's
   * payment.service.createDevBypassSignature.
   */
  async createDevBypassSignature(userId: string, sessionId: string) {
    if (!isPaymentDevBypass()) {
      throw new ForbiddenError('Dev payment bypass is disabled.');
    }

    const session = await checkoutRepository.findSessionForUser(sessionId, userId);
    if (!session) throw new NotFoundError('Checkout session not found.');
    if (session.purchaseType !== PurchaseType.DIRECT) {
      throw new BadRequestError(
        'Dev bypass is only available for DIRECT (full payment) purchases.',
      );
    }

    const transaction = await checkoutRepository.findDirectPaymentForOrder(session.id, userId);
    if (!transaction?.razorpayOrderId) {
      throw new NotFoundError('Payment order not found for this checkout session.');
    }

    const paymentId = `pay_dev_${Date.now()}`;
    return {
      razorpayOrderId: transaction.razorpayOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signDevPayment(transaction.razorpayOrderId, paymentId),
    };
  }

  private buildPaymentOrderResponse(session: any, razorpayOrderId: string) {
    const amount = toNumber(session.totalAmount);
    return {
      orderId: session.id,
      razorpayOrderId,
      keyId: getRazorpayKeyId(),
      amount,
      amountPaise: Math.round(amount * 100),
      currency: env.RAZORPAY_CURRENCY,
      paymentDevBypass: isPaymentDevBypass(),
    };
  }

  private generateOrderNumber(): Promise<string> {
    return Promise.resolve(generateSequentialOrderNumber());
  }

  async getSession(userId: string, sessionId: string) {
    const session = await checkoutRepository.findSessionForUser(sessionId, userId);
    if (!session) throw new NotFoundError('Checkout session not found.');
    if (session.userId !== userId) {
      throw new ForbiddenError('You can only access your own checkout session.');
    }

    const sessionItems = session.items?.length > 0 
      ? session.items 
      : [{ product: session.product, quantity: session.quantity, variant: session.variant }];
      
    const checkoutItems = sessionItems.map((i: any) => ({
      product: i.product,
      quantity: i.quantity,
      variant: resolveVariant(i.product, (i as any).variantId)
    }));

    const summary = buildSummary(checkoutItems);
    return {
      session: {
        id: session.id,
        userId: session.userId,
        productId: session.productId,
        quantity: session.quantity,
        purchaseType: session.purchaseType,
        addressId: session.addressId,
        totalAmount: toNumber(session.totalAmount),
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      summary,
    };
  }
}

export const checkoutService = new CheckoutService();
