import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../../common/errors/app-error';
import { auditLogService } from '../../verification/service/audit-log.service';
import type { AddWishlistItemBody } from '../dto/wishlist.dto';
import { wishlistRepository } from '../repository/wishlist.repository';

function toNumber(value: { toNumber?: () => number } | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (value && typeof value.toNumber === 'function') {
    try {
      return value.toNumber();
    } catch {
      return 0;
    }
  }
  return Number(value) || 0;
}

function parseImages(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter((item): item is string => typeof item === 'string');
  }
  if (typeof images === 'string' && images.trim()) {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      return [images];
    }
  }
  return [];
}

function mapItem(row: any) {
  if (!row) return null;

  const product = row.product && typeof row.product === 'object' ? row.product : null;
  if (!product) {
    // Orphan wishlist row (deleted product) — skip rather than 500.
    return null;
  }

  const mrp = toNumber(product.mrp ?? product.price ?? 0);
  const unitPrice = toNumber(product.price ?? product.sellingPrice ?? mrp);
  const discount = Math.max(mrp - unitPrice, 0);
  const stock = toNumber(product.stock ?? product.stockQuantity ?? 0) || 0;
  const status = String(product.status ?? '').toLowerCase();
  const isActive =
    product.isActive === true ||
    status === 'active' ||
    (!status && product.isActive !== false);
  const available = isActive && stock > 0;
  const images = parseImages(product.images ?? product.imageUrls);
  const imageUrl =
    images[0] ??
    (typeof product.image === 'string' ? product.image : null) ??
    (typeof product.imageUrl === 'string' ? product.imageUrl : null) ??
    null;

  const productId =
    row.productId ?? row.product_id ?? product.id ?? null;
  const createdAt = row.createdAt ?? row.created_at ?? null;
  const updatedAt = row.updatedAt ?? row.updated_at ?? createdAt;

  return {
    id: row.id,
    productId,
    createdAt,
    updatedAt,
    dateAdded: createdAt,
    product: {
      id: product.id,
      name: product.name ?? 'Product',
      brand: product.brand ?? null,
      sku: product.sku ?? null,
      imageUrl,
      unitPrice,
      mrp,
      discount,
      stockQuantity: stock,
      inStock: available,
      stockStatus: available
        ? stock <= 5
          ? 'LOW_STOCK'
          : 'IN_STOCK'
        : 'OUT_OF_STOCK',
    },
  };
}

export class WishlistService {
  async getWishlist(userId: string) {
    const rows = await wishlistRepository.listForUser(userId);
    const items = rows.map(mapItem).filter((item): item is NonNullable<typeof item> => Boolean(item));
    return {
      items,
      totalItems: items.length,
    };
  }

  async addItem(userId: string, input: AddWishlistItemBody) {
    const product = await wishlistRepository.findProduct(input.productId);
    if (!product) throw new NotFoundError('Product not found.');

    let variantId = input?.id ?? null;
    const variants = Array.isArray(product.variants) ? product.variants : [];

    if (variants.length > 0) {
      const variant =
        (variantId
          ? variants.find((row: any) => row.id === variantId)
          : variants.find((row: any) => row.isDefault) ?? variants[0]) ?? null;

      if (!variant) {
        throw new BadRequestError('Invalid product variant.', { code: 'INVALID_VARIANT' });
      }
      variantId = variant.id;
    }

    const existing = await wishlistRepository.findByProductVariant(
      userId,
      input.productId,
      variantId,
    );
    if (existing) {
      throw new ConflictError('Product is already in your wishlist.', {
        code: 'DUPLICATE_WISHLIST_ITEM',
        wishlistItemId: existing.id,
      });
    }

    const item = await wishlistRepository.create(userId, input.productId, variantId);
    await auditLogService.log({
      userId,
      action: 'WISHLIST_ITEM_ADDED',
      entity: 'wishlist_items',
      metadata: {
        wishlistItemId: item.id,
        productId: input.productId,
        timestamp: new Date().toISOString(),
      },
    });

    const wishlist = await this.getWishlist(userId);
    const mapped = mapItem(item);
    return {
      item: mapped,
      ...wishlist,
    };
  }

  async removeItem(userId: string, wishlistItemId: string) {
    const existing = await wishlistRepository.findByIdForUser(wishlistItemId, userId);
    if (!existing) throw new NotFoundError('Wishlist item not found.');

    await wishlistRepository.delete(existing.id);
    await auditLogService.log({
      userId,
      action: 'WISHLIST_ITEM_REMOVED',
      entity: 'wishlist_items',
      metadata: {
        wishlistItemId: existing.id,
        productId: existing.productId ?? existing.product_id,
        timestamp: new Date().toISOString(),
      },
    });

    return this.getWishlist(userId);
  }

  async moveToCart(userId: string, wishlistItemId: string) {
    const existing = await wishlistRepository.findByIdForUser(wishlistItemId, userId);
    if (!existing) throw new NotFoundError('Wishlist item not found.');

    const product = existing.product;
    if (!product) {
      throw new BadRequestError('Product is no longer available.', { code: 'PRODUCT_MISSING' });
    }

    const stock = toNumber(
      existing.variant?.stock ?? product.stock ?? product.stockQuantity ?? 0,
    );
    const status = String(product.status ?? '').toLowerCase();
    const isActive =
      product.isActive === true ||
      status === 'active' ||
      (!status && product.isActive !== false);

    if (!isActive || stock <= 0) {
      throw new BadRequestError('Product is out of stock.', { code: 'OUT_OF_STOCK' });
    }

    const productId = existing.productId ?? existing.product_id;
    const cartItem = await wishlistRepository.findCartItem(
      userId,
      productId,
      existing?.id,
    );
    if (cartItem && cartItem.quantity + 1 > stock) {
      throw new BadRequestError(`Only ${stock} unit(s) available in stock.`, {
        code: 'INSUFFICIENT_STOCK',
        available: stock,
      });
    }

    const moved = await wishlistRepository.moveToCart(userId, wishlistItemId);
    if (!moved || 'error' in moved) {
      if (moved && 'error' in moved && moved.error === 'INSUFFICIENT_STOCK') {
        throw new BadRequestError(`Only ${moved.stock} unit(s) available in stock.`, {
          code: 'INSUFFICIENT_STOCK',
          available: moved.stock,
        });
      }
      throw new NotFoundError('Wishlist item not found.');
    }

    await auditLogService.log({
      userId,
      action: 'WISHLIST_ITEM_MOVED_TO_CART',
      entity: 'wishlist_items',
      metadata: {
        wishlistItemId,
        productId: moved.item.productId ?? moved.item.product_id,
        timestamp: new Date().toISOString(),
      },
    });

    return this.getWishlist(userId);
  }

  async hasProduct(userId: string, productId: string, variantId?: string) {
    const existing = await wishlistRepository.findByProductVariant(
      userId,
      productId,
      variantId ?? null,
    );
    return {
      inWishlist: Boolean(existing),
      wishlistItemId: existing?.id ?? null,
    };
  }
}

export const wishlistService = new WishlistService();
