import { ProductDetails, ProductVariantSku } from '../models/product-details.models';
import { ProductDetail } from '../services/products-api.service';

function galleryFromUrls(urls: string[], name: string, prefix = 'img') {
  return urls.map((src, index) => ({
    id: `${prefix}-${index + 1}`,
    src,
    alt: `${name} image ${index + 1}`,
  }));
}

/** Pull a leading numeric size token from attribute values like "43 inch", "260L", "128GB". */
function extractSizeToken(value: string): string | null {
  const match = value.match(/(\d+(?:\.\d+)?)\s*(inch(?:es)?|"|l|kg|ton|gb|tb|mm)?/i);
  return match ? match[1] : null;
}

/**
 * Build a shopper-facing product title from the catalog name + selected variant attributes.
 * Example: "Samsung 55\" 4K Ultra HD Smart TV" + screen size 43 → "Samsung 43\" 4K Ultra HD Smart TV"
 */
export function buildVariantDisplayName(
  baseName: string,
  brand: string,
  variant: ProductVariantSku,
): string {
  const attrs = variant.attributes ?? {};
  let name = baseName;
  let changed = false;

  const screen = attrs['screen size'] ?? attrs['Screen Size'] ?? attrs['size'];
  if (screen) {
    const num = extractSizeToken(screen);
    if (num) {
      const next = name
        .replace(/\d+(?:\.\d+)?\s*(?:inch(?:es)?|")/gi, `${num}"`)
        .replace(/(\d+(?:\.\d+)?)(?=\s*4K|\s*Ultra|\s*Smart|\s*"|\s*$)/, num);
      if (next !== name) {
        name = next;
        changed = true;
      } else if (!name.includes(`${num}"`) && !name.includes(`${num} inch`)) {
        name = name.replace(brand, `${brand} ${num}"`).replace(/\s+/g, ' ').trim();
        changed = true;
      }
    }
  }

  const capacity = attrs['capacity'] ?? attrs['Capacity'];
  if (capacity) {
    const num = extractSizeToken(capacity);
    if (num) {
      const unit = /kg/i.test(capacity) ? 'kg' : /l/i.test(capacity) ? 'L' : '';
      const replacement = `${num}${unit}`;
      const next = name.replace(/\d+(?:\.\d+)?\s*(?:L|kg|Kg)/gi, replacement);
      if (next !== name) {
        name = next;
        changed = true;
      }
    }
  }

  const storage = attrs['storage'] ?? attrs['Storage'];
  if (storage) {
    const next = name.replace(/\(?\d+\s*GB\)?/gi, storage.includes('(') ? storage : `(${storage})`);
    if (next !== name) {
      name = next;
      changed = true;
    }
  }

  const tonnage = attrs['tonnage'] ?? attrs['Tonnage'];
  if (tonnage) {
    const next = name.replace(/\d+(?:\.\d+)?\s*Ton/gi, tonnage);
    if (next !== name) {
      name = next;
      changed = true;
    }
  }

  if (!changed && variant.variantName) {
    // Fallback: brand + variant label keeps title in sync with selection
    name = `${brand} ${variant.variantName}`.replace(/\s+/g, ' ').trim();
  }

  return name;
}

/** Rewrite overview copy so size/capacity mentions match the selected variant. */
export function buildVariantOverviewBody(
  baseBody: string,
  variant: ProductVariantSku,
): string {
  const attrs = variant.attributes ?? {};
  let body = baseBody;

  const screen = attrs['screen size'] ?? attrs['Screen Size'];
  if (screen) {
    const num = extractSizeToken(screen);
    if (num) {
      body = body
        .replace(/\d+(?:\.\d+)?-?\s*inch(?:es)?/gi, `${num}-inch`)
        .replace(/\d+(?:\.\d+)?\s*"/g, `${num}"`);
    }
  }

  const capacity = attrs['capacity'] ?? attrs['Capacity'];
  if (capacity) {
    const num = extractSizeToken(capacity);
    if (num) {
      if (/kg/i.test(capacity)) {
        body = body.replace(/\d+(?:\.\d+)?\s*kg/gi, `${num} kg`);
      } else {
        body = body.replace(/\d+(?:\.\d+)?\s*L(?:itres?|iters?)?/gi, `${num}L`);
      }
    }
  }

  const storage = attrs['storage'] ?? attrs['Storage'];
  if (storage) {
    body = body.replace(/\d+\s*GB/gi, storage);
  }

  const tonnage = attrs['tonnage'] ?? attrs['Tonnage'];
  if (tonnage) {
    body = body.replace(/\d+(?:\.\d+)?\s*Ton/gi, tonnage);
  }

  return body;
}

function withVariantPresentation(
  base: Pick<ProductDetails, 'baseName' | 'baseOverviewBody' | 'brand' | 'breadcrumbs'>,
  variant: ProductVariantSku | null,
): Pick<ProductDetails, 'name' | 'overviewTitle' | 'overviewBody' | 'breadcrumbs'> {
  if (!variant) {
    return {
      name: base.baseName,
      overviewTitle: base.baseName,
      overviewBody: base.baseOverviewBody,
      breadcrumbs: base.breadcrumbs,
    };
  }

  const name = buildVariantDisplayName(base.baseName, base.brand, variant);
  const overviewBody = buildVariantOverviewBody(base.baseOverviewBody, variant);
  const breadcrumbs = base.breadcrumbs.map((crumb, index, list) =>
    index === list.length - 1 ? { ...crumb, label: name } : crumb,
  );

  return {
    name,
    overviewTitle: name,
    overviewBody,
    breadcrumbs,
  };
}

export function mapProductDetails(detail: ProductDetail): ProductDetails {
  const selected =
    detail.productVariants?.find((row) => row.id === detail.selectedVariantId) ??
    detail.selectedVariant ??
    detail.productVariants?.find((row) => row.isDefault) ??
    detail.productVariants?.[0] ??
    null;

  const baseName = detail.name;
  const baseOverviewBody = detail.overviewBody || detail.description || '';
  const presentation = withVariantPresentation(
    {
      baseName,
      baseOverviewBody,
      brand: detail.brand,
      breadcrumbs: detail.breadcrumbs ?? [],
    },
    selected,
  );

  const displayName = presentation.name;
  const images =
    selected?.imagesGallery?.length
      ? selected.imagesGallery.map((img, index) => ({
          ...img,
          alt: `${displayName} image ${index + 1}`,
        }))
      : selected?.images?.length
        ? galleryFromUrls(selected.images, displayName, selected.id)
        : detail.imagesGallery.length > 0
          ? detail.imagesGallery
          : galleryFromUrls(detail.images, displayName);

  return {
    id: detail.id,
    name: displayName,
    baseName,
    brand: detail.brand,
    categoryLabel: detail.categoryLabel,
    subcategoryLabel: detail.subcategoryLabel,
    price: selected?.sellingPrice ?? detail.sellingPrice,
    mrp: (selected?.discount ?? detail.discount) > 0 ? (selected?.mrp ?? detail.mrp) : undefined,
    rating: detail.averageRating,
    reviewCount: detail.reviewCount,
    answeredQuestions: detail.questions.length,
    inStock: selected ? selected.inStock && detail.isActive : detail.inStock,
    stockQuantity: selected?.stock ?? detail.stock,
    sku: selected?.sku ?? detail.sku,
    deliveryPincode: '560001',
    warrantyLabel: detail.warrantyLabel,
    images,
    colors: detail.colors ?? [],
    variants: detail.variants ?? [],
    attributeGroups: detail.attributeGroups ?? [],
    productVariants: detail.productVariants ?? [],
    selectedVariantId: selected?.id ?? null,
    keySpecs: selected?.keySpecs?.length ? selected.keySpecs : detail.keySpecs,
    overviewTitle: presentation.overviewTitle,
    overviewBody: presentation.overviewBody,
    baseOverviewBody,
    overviewHighlights: detail.overviewHighlights,
    specifications: selected?.specificationRows?.length
      ? selected.specificationRows
      : detail.specificationRows,
    reviews: [],
    returnsPolicy: detail.returnsPolicy,
    questions: detail.questions,
    breadcrumbs: presentation.breadcrumbs,
    emiPlans: detail.emiPlans ?? [],
  };
}

export function applyVariantToDetails(
  current: ProductDetails,
  variant: ProductVariantSku,
  isActive = true,
): ProductDetails {
  const presentation = withVariantPresentation(
    {
      baseName: current.baseName || current.name,
      baseOverviewBody: current.baseOverviewBody || current.overviewBody,
      brand: current.brand,
      breadcrumbs: current.breadcrumbs,
    },
    variant,
  );

  const images =
    variant.imagesGallery?.length > 0
      ? variant.imagesGallery.map((img, index) => ({
          ...img,
          alt: `${presentation.name} image ${index + 1}`,
        }))
      : galleryFromUrls(variant.images ?? [], presentation.name, variant.id);

  return {
    ...current,
    ...presentation,
    price: variant.sellingPrice,
    mrp: variant.discount > 0 ? variant.mrp : undefined,
    inStock: isActive && variant.inStock,
    stockQuantity: variant.stock,
    sku: variant.sku,
    images,
    selectedVariantId: variant.id,
    keySpecs: variant.keySpecs?.length ? variant.keySpecs : current.keySpecs,
    specifications: variant.specificationRows?.length
      ? variant.specificationRows
      : current.specifications,
  };
}

export function findVariantByAttributes(
  variants: ProductVariantSku[],
  selected: Record<string, string>,
): ProductVariantSku | null {
  const list = variants ?? [];
  const keys = Object.keys(selected);
  if (keys.length === 0) return list.find((row) => row.isDefault) ?? list[0] ?? null;

  return (
    list.find((variant) =>
      keys.every((key) => variant.attributes?.[key] === selected[key]),
    ) ?? null
  );
}

export function isAttributeOptionAvailable(
  variants: ProductVariantSku[],
  selected: Record<string, string>,
  key: string,
  value: string,
): boolean {
  const next = { ...selected, [key]: value };
  const match = findVariantByAttributes(variants ?? [], next);
  return Boolean(match && match.inStock);
}
