import { jsonDb } from '../../../config/json-db';
import { v4 as uuidv4 } from 'uuid';

export class WishlistRepository {
  findProduct(productId: string) {
    return jsonDb.findOne('products', { id: productId });
  }

  async findByIdForUser(id: string, userId: string) {
    const item = jsonDb.findOne('wishlist_items', { id, user_id: userId });
    if (!item) return null;
    const product = this.findProduct(item.product_id);
    return { ...item, product };
  }

  async findByProductVariant(userId: string, productId: string, _variantId: string | null) {
    const item = jsonDb.findOne('wishlist_items', { user_id: userId, product_id: productId });
    if (!item) return null;
    const product = this.findProduct(productId);
    return { ...item, product };
  }

  async listForUser(userId: string) {
    const items = jsonDb.findMany('wishlist_items', { user_id: userId });
    return items.map((item: any) => {
      const product = this.findProduct(item.product_id);
      return { ...item, product };
    });
  }

  async create(userId: string, productId: string, _variantId: string | null) {
    let item = jsonDb.findOne('wishlist_items', { user_id: userId, product_id: productId });
    if (!item) {
      item = jsonDb.insert('wishlist_items', {
        id: uuidv4(),
        user_id: userId,
        product_id: productId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    const product = this.findProduct(productId);
    return { ...item, product };
  }

  delete(id: string) {
    return jsonDb.delete('wishlist_items', { id });
  }

  async count(userId: string) {
    return jsonDb.count('wishlist_items', { user_id: userId });
  }

  findCartItem(userId: string, productId: string, _variantId: string | null) {
    return jsonDb.findOne('cart_items', { user_id: userId, product_id: productId });
  }

  async moveToCart(userId: string, wishlistItemId: string) {
    const item = jsonDb.findOne('wishlist_items', { id: wishlistItemId, user_id: userId });
    if (!item) return null;

    const product = this.findProduct(item.product_id);
    const stock = product?.stock ?? 0;

    const existingCart = jsonDb.findOne('cart_items', { user_id: userId, product_id: item.product_id });

    if (existingCart) {
      if (existingCart.quantity + 1 > stock) {
        return { error: 'INSUFFICIENT_STOCK' as const, stock, item: { ...item, product } };
      }
      jsonDb.update('cart_items', { id: existingCart.id }, { quantity: existingCart.quantity + 1 });
    } else {
      jsonDb.insert('cart_items', {
        id: uuidv4(),
        user_id: userId,
        product_id: item.product_id,
        quantity: 1,
      });
    }

    jsonDb.delete('wishlist_items', { id: item.id });
    return { item: { ...item, product } };
  }
}

export const wishlistRepository = new WishlistRepository();
