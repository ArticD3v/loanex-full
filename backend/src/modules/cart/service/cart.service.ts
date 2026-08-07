import {
  BadRequestError,
  NotFoundError,
} from '../../../common/errors/app-error';
import { auditLogService } from '../../verification/service/audit-log.service';
import type { AddCartItemBody, UpdateCartItemBody } from '../dto/cart.dto';
import { cartRepository } from '../repository/cart.repository';

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

type CartRow = Awaited<ReturnType<typeof cartRepository.listForUser>>[number];

function resolvePricing(row: CartRow) {
  const variant = row.variant;
  const product = row.product as any;
  if (variant) {
    const mrp = toNumber(variant.mrp || variant.price);
    const unitPrice = toNumber(variant.sellingPrice ?? variant.discountPrice ?? variant.price);
    const images = parseImages(variant.images);
    return {
      mrp,
      unitPrice: unitPrice > 0 ? unitPrice : mrp,
      stock: variant.stock,
      imageUrl: images[0] ?? product.image,
      variantLabel: variant.variantName,
      sku: variant.sku,
    };
  }

  const mrp = toNumber(product.mrp || product.price);
  const unitPrice = toNumber(
    product.sellingPrice ?? product.discountPrice ?? product.price ?? mrp,
  );
  return {
    mrp,
    unitPrice: unitPrice > 0 ? unitPrice : mrp,
    stock: product.stock,
    imageUrl: product.image,
    variantLabel: product.variant,
    sku: product.sku,
  };
}

function resolveDeliveryCharge(product: any): number {
  return (
    toNumber(product?.deliveryCharges) ||
    toNumber(product?.deliveryCharge) ||
    toNumber(product?.wizardData?.deliveryCharges) ||
    0
  );
}

function mapItem(row: CartRow) {
  const pricing = resolvePricing(row);
  const deliveryCharge = resolveDeliveryCharge(row.product);
  const lineSubtotal = pricing.unitPrice * row.quantity;
  const lineDiscount = Math.max(pricing.mrp - pricing.unitPrice, 0) * row.quantity;
  const isActive = row.product.status === 'active';
  const available = isActive && pricing.stock > 0;

  return {
    id: row.id,
    productId: row.product_id,
    quantity: row.quantity,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    product: {
      id: row.product.id,
      name: row.product.name,
      brand: row.product.brand,
      sku: pricing.sku,
      imageUrl: pricing.imageUrl,
      unitPrice: pricing.unitPrice,
      mrp: pricing.mrp,
      deliveryCharge,
      stockQuantity: pricing.stock,
      inStock: available,
      stockStatus: available
        ? pricing.stock <= 5
          ? 'LOW_STOCK'
          : 'IN_STOCK'
        : 'OUT_OF_STOCK',
    },
    lineSubtotal,
    lineDiscount,
  };
}

function buildSummary(items: ReturnType<typeof mapItem>[]) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.lineSubtotal, 0);
  const discount = items.reduce((sum, item) => sum + item.lineDiscount, 0);
  const deliveryCharges = items.reduce((sum, item) => {
    if (!item.product.inStock) return sum;
    return sum + item.product.deliveryCharge;
  }, 0);
  const grandTotal = subtotal + deliveryCharges;

  return { totalItems, subtotal, discount, deliveryCharges, grandTotal };
}

export class CartService {
  async getCart(userId: string) {
    const rows = await cartRepository.listForUser(userId);
    const items = rows.map(mapItem);
    return {
      items,
      summary: buildSummary(items),
    };
  }

  async addItem(userId: string, input: AddCartItemBody) {
    const product = await cartRepository.findProduct(input.productId);
    if (!product) throw new NotFoundError('Product not found.');

    let variantId = input?.id ?? null;
    let stock = product.stock;

    if (product.variants && product.variants.length > 0) {
      const variant =
        (variantId
          ? product.variants.find((row) => row.id === variantId)
          : product.variants.find((row) => row.isDefault) ?? product.variants[0]) ?? null;

      if (!variant) {
        throw new BadRequestError('Invalid product variant.', { code: 'INVALID_VARIANT' });
      }

      variantId = variant.id;
      stock = variant.stock;

      if (product.status !== 'active' || stock <= 0) {
        throw new BadRequestError('Selected variant is out of stock.', { code: 'OUT_OF_STOCK' });
      }
    } else if (product.status !== 'active' || product.stock <= 0) {
      throw new BadRequestError('Product is out of stock.', { code: 'OUT_OF_STOCK' });
    }

    const existing = await cartRepository.findItemByProductVariant(
      userId,
      input.productId,
      variantId,
    );
    const nextQty = (existing?.quantity ?? 0) + input.quantity;

    if (nextQty > stock) {
      throw new BadRequestError(`Only ${stock} unit(s) available in stock.`, {
        code: 'INSUFFICIENT_STOCK',
        available: stock,
      });
    }

    const item = existing
      ? await cartRepository.updateQuantity(existing.id, nextQty)
      : await cartRepository.create(userId, input.productId, variantId, input.quantity);

    await auditLogService.log({
      userId,
      action: existing ? 'CART_ITEM_UPDATED' : 'CART_ITEM_ADDED',
      entity: 'cart_items',
      metadata: {
        cartItemId: item.id,
        productId: input.productId,
        quantity: item.quantity,
        timestamp: new Date().toISOString(),
      },
    });

    const cart = await this.getCart(userId);
    return {
      item: mapItem(item),
      ...cart,
    };
  }

  async updateItem(userId: string, cartItemId: string, input: UpdateCartItemBody) {
    const existing = await cartRepository.findItemByIdForUser(cartItemId, userId);
    if (!existing) throw new NotFoundError('Cart item not found.');

    if (input.quantity === 0) {
      await cartRepository.delete(existing.id);
      await auditLogService.log({
        userId,
        action: 'CART_ITEM_REMOVED',
        entity: 'cart_items',
        metadata: {
          cartItemId: existing.id,
          productId: existing.productId,
          reason: 'QUANTITY_ZERO',
          timestamp: new Date().toISOString(),
        },
      });
      return this.getCart(userId);
    }

    const pricing = resolvePricing(existing);
    if (existing.product.status !== 'active' || pricing.stock <= 0) {
      throw new BadRequestError('Product is out of stock.', { code: 'OUT_OF_STOCK' });
    }

    if (input.quantity > pricing.stock) {
      throw new BadRequestError(`Only ${pricing.stock} unit(s) available in stock.`, {
        code: 'INSUFFICIENT_STOCK',
        available: pricing.stock,
      });
    }

    await cartRepository.updateQuantity(existing.id, input.quantity);
    await auditLogService.log({
      userId,
      action: 'CART_ITEM_UPDATED',
      entity: 'cart_items',
      metadata: {
        cartItemId: existing.id,
        productId: existing.productId,
        quantity: input.quantity,
        timestamp: new Date().toISOString(),
      },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, cartItemId: string) {
    const existing = await cartRepository.findItemByIdForUser(cartItemId, userId);
    if (!existing) throw new NotFoundError('Cart item not found.');

    await cartRepository.delete(existing.id);
    await auditLogService.log({
      userId,
      action: 'CART_ITEM_REMOVED',
      entity: 'cart_items',
      metadata: {
        cartItemId: existing.id,
        productId: existing.productId,
        timestamp: new Date().toISOString(),
      },
    });

    return this.getCart(userId);
  }

  async clear(userId: string) {
    const result = await cartRepository.clear(userId);
    await auditLogService.log({
      userId,
      action: 'CART_CLEARED',
      entity: 'cart_items',
      metadata: { deleted: result.count, timestamp: new Date().toISOString() },
    });
    return this.getCart(userId);
  }

  async moveToWishlist(userId: string, cartItemId: string) {
    const moved = await cartRepository.moveToWishlist(cartItemId, userId);
    if (!moved) throw new NotFoundError('Cart item not found.');

    await auditLogService.log({
      userId,
      action: 'CART_ITEM_MOVED_TO_WISHLIST',
      entity: 'cart_items',
      metadata: {
        cartItemId,
        productId: moved.productId,
        timestamp: new Date().toISOString(),
      },
    });

    return this.getCart(userId);
  }
}

export const cartService = new CartService();
