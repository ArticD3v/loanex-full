import {
  BadRequestError,
  NotFoundError,
} from '../../../common/errors/app-error';
import { auditLogService } from '../../verification/service/audit-log.service';
import type { AddCartItemBody, UpdateCartItemBody } from '../dto/cart.dto';
import { cartRepository } from '../repository/cart.repository';
import {
  resolveUnitPricing,
  resolveDeliveryCharges,
} from '../../../common/utils/product-pricing';

function parseImages(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

type CartRow = Awaited<ReturnType<typeof cartRepository.listForUser>>[number];

function mapItem(row: CartRow) {
  const product = row.product as any;
  const variant = row.variant;
  // Same pricing function as checkout — MRP, unit price and discount can never
  // disagree between the cart page and the checkout summary.
  const { mrp, unitPrice } = resolveUnitPricing(product, variant);
  const deliveryCharge = resolveDeliveryCharges(product);
  const stock = variant?.stock ?? product.stock;
  const images = parseImages(variant?.images);
  const lineSubtotal = unitPrice * row.quantity;
  const lineDiscount = Math.max(mrp - unitPrice, 0) * row.quantity;
  const isActive = product.status === 'active';
  const available = isActive && stock > 0;

  return {
    id: row.id,
    productId: row.product_id,
    variantId: row.variant_id ?? null,
    quantity: row.quantity,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    product: {
      id: product.id,
      name: product.name,
      brand: product.brand,
      sku: variant?.sku ?? product.sku,
      imageUrl: images[0] ?? product.image,
      unitPrice,
      mrp,
      deliveryCharge,
      stockQuantity: stock,
      inStock: available,
      stockStatus: available
        ? stock <= 5
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

    let variantId = input?.variantId ?? input?.id ?? null;
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

    const stock = existing.variant?.stock ?? existing.product.stock;
    if (existing.product.status !== 'active' || stock <= 0) {
      throw new BadRequestError('Product is out of stock.', { code: 'OUT_OF_STOCK' });
    }

    if (input.quantity > stock) {
      throw new BadRequestError(`Only ${stock} unit(s) available in stock.`, {
        code: 'INSUFFICIENT_STOCK',
        available: stock,
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
      metadata: { deleted: result, timestamp: new Date().toISOString() },
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
