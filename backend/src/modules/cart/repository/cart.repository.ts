import { jsonDb } from '../../../config/json-db';

export class CartRepository {
  findProduct(productId: string) {
    return jsonDb.findOne('products', { id: productId });
  }

  findVariant(productId: string, variantId: string | null | undefined) {
    if (!variantId) return null;
    const product = this.findProduct(productId);
    const variants = product?.variants ?? product?.productVariants ?? product?.product_variants ?? [];
    return variants.find((row: any) => String(row.id) === String(variantId)) ?? null;
  }

  /** Attach product + (when stored) the variant so pricing uses variant data. */
  private withRelations(item: any) {
    if (!item) return item;
    const product = this.findProduct(item.product_id);
    const variant = item.variant_id
      ? this.findVariant(item.product_id, item.variant_id)
      : null;
    return { ...item, product, variant };
  }

  async findItemByIdForUser(id: string, userId: string) {
    const items = jsonDb.findMany('cart_items', { id, user_id: userId });
    return this.withRelations(items[0] ?? null);
  }

  async findItemByProductVariant(
    userId: string,
    productId: string,
    variantId: string | null,
  ) {
    const items = jsonDb.findMany('cart_items', { user_id: userId, product_id: productId });
    const item = items.find(
      (row: any) => (row.variant_id ?? null) === (variantId ?? null),
    );
    if (item) return this.withRelations(item);
    // Only fall back to a base (no-variant) line for legacy rows — never to a
    // DIFFERENT variant line, or adding variant B would bump variant A.
    if (!variantId) {
      const base = items.find((row: any) => !row.variant_id);
      if (base) return this.withRelations(base);
    }
    return null;
  }

  async listForUser(userId: string) {
    const items = jsonDb.findMany('cart_items', { user_id: userId });
    return items
      .sort((a: any, b: any) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      })
      .map((item: any) => this.withRelations(item));
  }

  async create(
    userId: string,
    productId: string,
    variantId: string | null,
    quantity: number,
  ) {
    const existing = jsonDb.findOne('cart_items', {
      user_id: userId,
      product_id: productId,
      variant_id: variantId ?? null,
    });
    let item: any;
    if (existing) {
      item = jsonDb.update('cart_items', { id: existing.id }, {
        quantity: (Number(existing.quantity) || 0) + quantity,
      });
    } else {
      item = jsonDb.insert('cart_items', {
        user_id: userId,
        product_id: productId,
        variant_id: variantId ?? null,
        quantity,
        created_at: new Date().toISOString(),
      });
    }
    return this.withRelations(item);
  }

  async updateQuantity(id: string, quantity: number) {
    const item = jsonDb.update('cart_items', { id }, { quantity });
    if (!item) return null;
    return this.withRelations(item);
  }

  delete(id: string) {
    return jsonDb.delete('cart_items', { id });
  }

  clear(userId: string) {
    return jsonDb.deleteMany('cart_items', { user_id: userId });
  }

  /**
   * Reduce the cart lines for products that were actually purchased — used at
   * payment success so abandoned checkouts keep the customer's cart intact.
   * Only the bought quantities leave the cart: if the customer checked out
   * fewer units than the line holds, the line quantity is reduced instead of
   * the whole line being deleted. Anything added later survives.
   */
  removeProducts(
    userId: string,
    purchases: Array<{ productId: string; quantity: number; variantId?: string | null }> | undefined | null,
  ): number {
    const map = new Map<string, number>();
    for (const p of purchases ?? []) {
      if (!p?.productId) continue;
      const qty = Math.max(1, Math.floor(Number(p.quantity) || 1));
      const key = `${p.productId}::${p.variantId ?? ''}`;
      map.set(key, (map.get(key) ?? 0) + qty);
    }
    if (map.size === 0) return 0;
    const items = jsonDb.findMany('cart_items', { user_id: userId });
    let removed = 0;
    for (const item of items) {
      // Variant-aware match: a purchase carrying a variantId reduces exactly
      // that line. A purchase WITHOUT a variant (EMI / legacy callers) reduces
      // any line of that product.
      const exactKey = `${item.product_id}::${item.variant_id ?? ''}`;
      let bought = map.get(exactKey);
      if (!bought) {
        // Purchase without variant → match any line of this product, but only
        // if no other purchase claimed a specific variant of it.
        const anyKey = `${item.product_id}::`;
        if (map.has(anyKey)) bought = map.get(anyKey);
      }
      if (!bought) continue;
      const lineQty = Math.max(0, Number(item.quantity) || 0);
      if (lineQty <= bought) {
        jsonDb.delete('cart_items', { id: item.id });
        removed += 1;
        continue;
      }
      // Low-stock guard: never leave the cart holding more units than are
      // available. This runs right after decrementStockDurable, so the product
      // row already reflects the post-order stock — clamp the leftover to it
      // instead of leaving an unfulfillable cart line.
      const rawStock = Number(this.findProduct(item.product_id)?.stock);
      const available = Number.isFinite(rawStock) && rawStock >= 0 ? rawStock : Number.POSITIVE_INFINITY;
      const remaining = Math.min(lineQty - bought, available);
      if (remaining <= 0) {
        jsonDb.delete('cart_items', { id: item.id });
      } else {
        jsonDb.update('cart_items', { id: item.id }, {
          quantity: remaining,
        });
      }
      removed += 1;
    }
    return removed;
  }

  async countItems(userId: string) {
    const items = jsonDb.findMany('cart_items', { user_id: userId });
    const total_quantity = items.reduce((sum: number, i: any) => sum + (Number(i.quantity) || 0), 0);
    return {
      _sum: { quantity: total_quantity },
      _count: { _all: items.length },
    };
  }

  async moveToWishlist(cartItemId: string, userId: string) {
    const items = jsonDb.findMany('cart_items', { id: cartItemId, user_id: userId });
    const item = items[0];
    if (!item) return null;
    // Add to wishlist if not already present
    const existing = jsonDb.findOne('wishlist_items', { user_id: userId, product_id: item.product_id });
    if (!existing) {
      jsonDb.insert('wishlist_items', { user_id: userId, product_id: item.product_id });
    }
    jsonDb.delete('cart_items', { id: cartItemId });
    return item;
  }
}

export const cartRepository = new CartRepository();
