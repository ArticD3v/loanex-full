/**
 * Single source of truth for product/variant pricing (MRP, unit price,
 * discount). Both the cart and the checkout derive their numbers from this
 * module, so a product can never show a different MRP/discount on the cart
 * page than on the checkout summary.
 */

export function toNumber(
  value: { toNumber?: () => number } | number | string | null | undefined,
): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
}

export function parseDiscountPercent(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const raw = String(value).trim();
  const match = raw.match(/(-?\d+(?:\.\d+)?)\s*%/);
  if (match) return Math.max(0, Number(match[1]));
  // Bare number only if it looks like a percent field (0–100) and original had %
  return 0;
}

export function resolveDeliveryCharges(product: any): number {
  return (
    toNumber(product?.deliveryCharges) ||
    toNumber(product?.deliveryCharge) ||
    toNumber(product?.wizardData?.deliveryCharges) ||
    toNumber(product?.wizardData?.deliveryCharge) ||
    0
  );
}

/**
 * Resolve MRP / unit price / discount for a product, preferring the selected
 * variant when present. MRP falls back to the product MRP when the variant
 * does not carry one, so variant items never display a higher "MRP" than the
 * base product just because the variant row stores a plain price.
 */
export function resolveUnitPricing(
  product: any,
  variant?: { mrp?: unknown; price?: unknown; sellingPrice?: unknown; discountPrice?: unknown } | null,
): { mrp: number; unitPrice: number; discount: number } {
  const mrp = toNumber(
    variant?.mrp ?? variant?.price ?? product.mrp ?? product.price ?? product.sellingPrice,
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
