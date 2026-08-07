import { jsonDb } from '../../../config/json-db';

export class CartRepository {
  findProduct(productId: string) {
    return jsonDb.findOne('products', { id: productId });
  }

  findVariant(_variantId: string) {
    return null;
  }

  async findItemByIdForUser(id: string, userId: string) {
    const items = jsonDb.findMany('cart_items', { id, user_id: userId });
    const item = items[0];
    if (!item) return null;
    const product = this.findProduct(item.product_id);
    return { ...item, product };
  }

  async findItemByProductVariant(userId: string, productId: string, _variantId: string | null) {
    const items = jsonDb.findMany('cart_items', { user_id: userId, product_id: productId });
    const item = items[0];
    if (!item) return null;
    const product = this.findProduct(productId);
    return { ...item, product };
  }

  async listForUser(userId: string) {
    const items = jsonDb.findMany('cart_items', { user_id: userId });
    return items
      .sort((a: any, b: any) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      })
      .map((item: any) => ({
        ...item,
        product: this.findProduct(item.product_id),
      }));
  }

  async create(userId: string, productId: string, _variantId: string | null, quantity: number) {
    const existing = jsonDb.findOne('cart_items', { user_id: userId, product_id: productId });
    let item: any;
    if (existing) {
      item = jsonDb.update('cart_items', { id: existing.id }, {
        quantity: (Number(existing.quantity) || 0) + quantity,
      });
    } else {
      item = jsonDb.insert('cart_items', {
        user_id: userId,
        product_id: productId,
        quantity,
        created_at: new Date().toISOString(),
      });
    }
    const product = this.findProduct(productId);
    return { ...item, product };
  }

  async updateQuantity(id: string, quantity: number) {
    const item = jsonDb.update('cart_items', { id }, { quantity });
    if (!item) return null;
    const product = this.findProduct(item.product_id);
    return { ...item, product };
  }

  delete(id: string) {
    return jsonDb.delete('cart_items', { id });
  }

  clear(userId: string) {
    return jsonDb.deleteMany('cart_items', { user_id: userId });
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
