import { CheckoutSessionStatus, PurchaseType } from '../repository/checkout.repository';
type Product = any;
type ProductVariant = any;
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors/app-error';
import { auditLogService } from '../../verification/service/audit-log.service';
import type { CreateCheckoutBody } from '../dto/checkout.dto';
import { checkoutRepository } from '../repository/checkout.repository';

function toNumber(value: { toNumber?: () => number } | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
}

function parseImages(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter((item): item is string => typeof item === 'string');
  }
  return [];
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
    const mrp = toNumber(variant?.price ?? product.price);
    const rawDiscount = variant ? variant.discountPrice : product.discountPrice;
    const unitPrice = rawDiscount == null ? mrp : toNumber(rawDiscount);
    const deliveryCharges = toNumber(product.deliveryCharge);
    const productPrice = unitPrice * quantity;
    const discount = Math.max(mrp - unitPrice, 0) * quantity;
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
        variant: variant?.name ?? null,
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
  const variants = product.variants ?? [];
  if (variants.length === 0) {
    if (variantId) {
      throw new BadRequestError('This product has no variants.', { code: 'INVALID_VARIANT' });
    }
    return null;
  }

  const variant =
    (variantId
      ? product.variants.find((row) => row.id === variantId)
      : product.variants.find((row) => row.isDefault) ?? product.variants[0]) ?? null;

  if (!variant) {
    throw new BadRequestError('Invalid product variant.', { code: 'INVALID_VARIANT' });
  }

  return variant;
}

import { cartRepository } from '../../cart/repository/cart.repository';

export class CheckoutService {
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
    
    if (input.mode === 'CART') {
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
      const variant = resolveVariant(product, (input as any)?.id);
      checkoutItems = [{ product, quantity: input.quantity, variant }];
    }

    const summary = buildSummary(checkoutItems);
    
    if (summary.isAnyOutOfStock) {
      throw new BadRequestError('One or more items are out of stock or have insufficient quantity.', { code: 'OUT_OF_STOCK' });
    }

    const purchaseType = input.purchaseType as PurchaseType;
    
    if (purchaseType === 'EMI' && checkoutItems.length > 1) {
      throw new BadRequestError('EMI is available for single products only. Multiple items require Full Payment.');
    }

    const sessionItems = summary.items.map(i => ({
      productId: i.product.id,
      quantity: i.quantity,
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
    
    if (input.mode === 'CART') {
      await cartRepository.clear(userId);
    }

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
