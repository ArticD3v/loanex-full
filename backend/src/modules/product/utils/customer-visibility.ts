import type { ListProductsQuery } from '../dto/product.dto';

function isPlaceholderName(name: string): boolean {
  const n = name.trim();
  if (!n) return true;
  // Wizard default title often ends with " *" or is literally "Product Name *"
  if (/\*$/.test(n)) return true;
  if (/^product name\b/i.test(n)) return true;
  return false;
}

function isPlaceholderSku(sku: string): boolean {
  const s = sku.trim();
  if (!s) return true;
  return /^model number/i.test(s);
}

/**
 * Customer-facing display name. Wizard placeholders are replaced with
 * brand + product type when those fields were filled in admin.
 */
export function resolveCustomerFacingName(product: any): string {
  const name = String(product?.name ?? '').trim();
  if (name && !isPlaceholderName(name)) return name;

  const brand = String(product?.brand ?? '').trim();
  const type = String(product?.productType ?? '').trim();
  const category = String(product?.category ?? '').trim();
  const typeOrCategory =
    type && !/^sub category/i.test(type)
      ? type
      : category && !/^sub category/i.test(category)
        ? category
        : '';

  if (brand && typeOrCategory) return `${brand} ${typeOrCategory}`;
  if (brand) return brand;
  if (typeOrCategory) return typeOrCategory;
  return name || 'Product';
}

/**
 * Customer-facing catalog filter.
 * Admin may mark incomplete wizard rows as `active` by mistake (e.g. name
 * "Product Name *" with no brand/price). Those must not appear in the shop.
 * Products with real brand + price are treated as publishable even if the
 * wizard title/SKU defaults were left unchanged.
 * Admin list with status=all|draft|inactive is unaffected (explicit status query).
 */
export function isIncompleteCatalogDraft(product: any): boolean {
  if (!product) return true;
  const name = String(product.name ?? '').trim();
  const sku = String(product.sku ?? '').trim();
  const brand = String(product.brand ?? '').trim();
  const price = Number(product.price ?? product.sellingPrice ?? 0);

  const hasPlaceholderIdentity = isPlaceholderName(name) || isPlaceholderSku(sku);
  if (!hasPlaceholderIdentity) return false;

  // Published intent: admin set brand and a selling price.
  if (brand && Number.isFinite(price) && price > 0) return false;

  return true;
}

/** Products visible on the customer website (active + complete). */
export function isCustomerVisibleProduct(product: any): boolean {
  const status = String(product?.status ?? 'active').toLowerCase();
  if (status !== 'active') return false;
  if (isIncompleteCatalogDraft(product)) return false;
  return true;
}

/** Apply customer visibility unless an explicit admin status filter is requested. */
export function applyCustomerCatalogVisibility(
  rows: any[],
  reqQuery: Pick<ListProductsQuery, 'status'> | undefined,
): any[] {
  const status = reqQuery?.status;
  // Explicit status queries (admin / tooling) keep raw status filtering only.
  if (status && status !== 'all' && status !== 'active') {
    return rows;
  }
  if (status === 'all') {
    return rows;
  }
  // Default customer list (no status or status=active): hide incomplete drafts.
  return rows.filter((p) => isCustomerVisibleProduct(p));
}
