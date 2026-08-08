import { jsonDb } from '../../config/json-db';

/**
 * Resolve a product's primary image from the products table.
 *
 * Replaces the old per-product hardcoded Unsplash maps that shipped inside
 * receipt/payment/loan services. When the product exists the image comes from
 * the real catalog row (image / imageUrl / galleryImages). When it does not,
 * we return the caller-supplied fallback (e.g. an image already attached to
 * the order/application record) or null so the UI renders its own placeholder
 * instead of a fake per-product URL.
 */
export function resolveProductImage(
  productId: string | null | undefined,
  fallback?: string | null,
): string | null {
  if (productId) {
    const product = jsonDb.findOne('products', { id: productId });
    if (product) {
      const image =
        product.image ??
        product.imageUrl ??
        product.galleryImages?.[0] ??
        product.gallery_images?.[0];
      if (image) return image;
    }
  }
  return fallback ?? null;
}

/**
 * Resolve a product's brand from the products table, falling back to the
 * caller-supplied brand (already stored on the order/application record).
 */
export function resolveProductBrand(
  productId: string | null | undefined,
  fallback?: string | null,
): string | null {
  if (productId) {
    const product = jsonDb.findOne('products', { id: productId });
    if (product?.brand) return product.brand;
  }
  return fallback ?? null;
}
