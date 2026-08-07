/**
 * Sanitize in-memory collection rows before mirroring to Supabase.
 * PostgREST rejects unknown columns (e.g. users.createdAt), which previously
 * caused user+password inserts to fail silently — breaking login after logout
 * once a cold serverless instance rehydrated from Supabase.
 */
function pickDefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out as Partial<T>;
}

function sanitizeUsersRow(item: Record<string, any>, mode: 'insert' | 'update'): Record<string, any> {
  const now = new Date().toISOString();
  // Only columns that exist on public.users today.
  // Do NOT send createdAt / status / mobileVerified — PostgREST rejects unknown
  // columns and previously caused password hashes to never persist.
  return pickDefined({
    ...(mode === 'insert' && item.id != null ? { id: item.id } : {}),
    phone: item.phone,
    email: item.email,
    role: item.role,
    encryptedPassword:
      item.encryptedPassword !== undefined
        ? item.encryptedPassword
        : item.password !== undefined
          ? item.password
          : undefined,
    password: item.password,
    created_at: item.created_at ?? item.createdAt ?? (mode === 'insert' ? now : undefined),
    updated_at: item.updated_at ?? item.updatedAt ?? now,
    updatedAt: item.updatedAt ?? item.updated_at ?? now,
  });
}

function sanitizeProfilesRow(item: Record<string, any>, mode: 'insert' | 'update'): Record<string, any> {
  const now = new Date().toISOString();
  return pickDefined({
    ...(mode === 'insert' && item.id != null ? { id: item.id } : {}),
    mobile_number: item.mobile_number ?? item.mobileNumber,
    fullName: item.fullName,
    email: item.email,
    dob: item.dob,
    gender: item.gender,
    kyc_status: item.kyc_status,
    branches: item.branches,
    pincodes: item.pincodes,
    createdAt: item.createdAt ?? (mode === 'insert' ? now : undefined),
    updatedAt: item.updatedAt ?? now,
  });
}

function sanitizeRefreshTokensRow(item: Record<string, any>, mode: 'insert' | 'update'): Record<string, any> {
  const now = new Date().toISOString();
  return pickDefined({
    ...(mode === 'insert' && item.id != null ? { id: item.id } : {}),
    token: item.token,
    expiresAt: item.expiresAt,
    userId: item.userId,
    createdAt: item.createdAt ?? (mode === 'insert' ? now : undefined),
    updatedAt: item.updatedAt ?? now,
  });
}

function isUuid(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

/** Only columns that exist on public.products — unknown keys break PostgREST upserts. */
function sanitizeProductsRow(item: Record<string, any>, mode: 'insert' | 'update'): Record<string, any> {
  const now = new Date().toISOString();
  const categoryId = isUuid(item.categoryId) ? item.categoryId : undefined;
  const subCategoryId = isUuid(item.subCategoryId) ? item.subCategoryId : undefined;
  const childCategoryId = isUuid(item.childCategoryId) ? item.childCategoryId : undefined;
  const warehouseId = isUuid(item.warehouseId) ? item.warehouseId : undefined;
  const selectedEmiPlanId = isUuid(item.selectedEmiPlanId) ? item.selectedEmiPlanId : undefined;

  // products.id is VARCHAR(255) — always persist the in-memory id on insert.
  // Dropping non-UUID ids made Supabase mint a new id, so checkout lookups by the
  // client-facing id returned NOT_FOUND after hydrate/cold start.
  return pickDefined({
    ...(mode === 'insert' && item.id != null && String(item.id).trim() !== ''
      ? { id: String(item.id) }
      : {}),
    name: item.name,
    sku: item.sku,
    brand: item.brand,
    description: item.description,
    categoryId,
    image: item.image,
    price: item.price,
    mrp: item.mrp,
    stock: item.stock,
    status: item.status,
    emiAvailable: item.emiAvailable,
    featured: item.featured,
    trending: item.trending,
    recommended: item.recommended,
    shortDescription: item.shortDescription,
    galleryImages: item.galleryImages,
    warranty: item.warranty,
    hsnCode: item.hsnCode,
    manufacturer: item.manufacturer,
    createdAt: item.createdAt ?? (mode === 'insert' ? now : undefined),
    wizardData: item.wizardData,
    amazonPrice: item.amazonPrice,
    availableStock: item.availableStock,
    barcode: item.barcode,
    boxContents: item.boxContents,
    cashPurchase: item.cashPurchase,
    childCategoryId,
    colourSizeVariant: item.colourSizeVariant,
    countryOfOrigin: item.countryOfOrigin,
    defaultDownPaymentPercent: item.defaultDownPaymentPercent,
    deliveryChargeMethod: item.deliveryChargeMethod,
    deliveryCharges: item.deliveryCharges,
    deliveryCode: item.deliveryCode,
    deliveryConfirmationOtp: item.deliveryConfirmationOtp,
    deliveryDays: item.deliveryDays,
    deliveryPartner: item.deliveryPartner,
    deliveryZone: item.deliveryZone,
    discount: item.discount,
    dispatchSla: item.dispatchSla,
    documentationCharge: item.documentationCharge,
    downPaymentEditableAtApproval: item.downPaymentEditableAtApproval,
    eligiblePinCodes: item.eligiblePinCodes,
    expressDelivery: item.expressDelivery,
    features: item.features,
    firstEmiDueAfter: item.firstEmiDueAfter,
    flipkartPrice: item.flipkartPrice,
    gracePeriod: item.gracePeriod,
    gst: item.gst,
    gstAmount: item.gstAmount,
    height: item.height,
    installationCharge: item.installationCharge,
    installationRequired: item.installationRequired,
    invoiceSetting: item.invoiceSetting,
    keywords: Array.isArray(item.keywords) ? item.keywords.join(', ') : item.keywords,
    landingCost: item.landingCost,
    length: item.length,
    margin: item.margin,
    marketLowestPrice: item.marketLowestPrice,
    maxDownPayment: item.maxDownPayment,
    maxQuantityPerCustomer: item.maxQuantityPerCustomer,
    maximumDiscountAllowed: item.maximumDiscountAllowed,
    maximumQuantity: item.maximumQuantity,
    metaDescription: item.metaDescription,
    metaTitle: item.metaTitle,
    minCustomerDownPayment: item.minCustomerDownPayment,
    minOrderQuantity: item.minOrderQuantity,
    minimumCustomerAge: item.minimumCustomerAge,
    minimumQuantity: item.minimumQuantity,
    modelNumber: item.modelNumber,
    openingStock: item.openingStock,
    otherWebsitePrice: item.otherWebsitePrice,
    priceCheckedBy: item.priceCheckedBy,
    priceCheckedDate: item.priceCheckedDate,
    priceMatchAllowed: item.priceMatchAllowed,
    productCondition: item.productCondition,
    productType: item.productType,
    productVideoUrl: item.productVideoUrl,
    purchasePrice: item.purchasePrice,
    replacementDays: item.replacementDays,
    replacementWindow: item.replacementWindow,
    requiresFieldVerification: item.requiresFieldVerification,
    requiresSerialImeiCapture: item.requiresSerialImeiCapture,
    reservedStock: item.reservedStock,
    selectedEmiPlanId,
    serialImeiCaptureAtDelivery: item.serialImeiCaptureAtDelivery,
    serialImeiTracking: item.serialImeiTracking,
    serviceChargeMethod: item.serviceChargeMethod,
    slug: item.slug,
    specifications: item.specifications,
    subCategoryId,
    trackInventory: item.trackInventory,
    verificationCharge: item.verificationCharge,
    warehouseId,
    weight: item.weight,
    width: item.width,
  });
}

function sanitizeBannersRow(item: Record<string, any>, mode: 'insert' | 'update'): Record<string, any> {
  const now = new Date().toISOString();
  const imageUrl = item.image_url ?? item.imageUrl ?? '';
  return pickDefined({
    ...(mode === 'insert' && item.id != null && String(item.id).trim() !== ''
      ? { id: String(item.id) }
      : {}),
    title: item.title,
    subtitle: item.subtitle ?? '',
    badgeText: item.badgeText ?? item.badge_text ?? '',
    image_url: imageUrl,
    link: item.link ?? '/',
    sort_order: item.sort_order ?? item.sortOrder ?? 0,
    status: item.status ?? 'active',
    createdAt: item.createdAt ?? (mode === 'insert' ? now : undefined),
  });
}

function sanitizeCategoriesRow(item: Record<string, any>, mode: 'insert' | 'update'): Record<string, any> {
  const now = new Date().toISOString();
  return pickDefined({
    ...(mode === 'insert' && item.id != null && String(item.id).trim() !== ''
      ? { id: String(item.id) }
      : {}),
    name: item.name,
    description: item.description ?? '',
    icon: item.icon ?? '',
    color: item.color ?? '',
    bgColor: item.bgColor ?? '',
    status: item.status ?? 'active',
    sortOrder: item.sortOrder ?? 0,
    createdAt: item.createdAt ?? (mode === 'insert' ? now : undefined),
  });
}

/** Strip unknown keys for collections that have broken on schema mismatch. */
export function sanitizeMirrorPayload(
  collectionName: string,
  item: Record<string, any>,
  mode: 'insert' | 'update' = 'insert',
): Record<string, any> {
  if (!item || typeof item !== 'object') return item;

  switch (collectionName) {
    case 'users':
      return sanitizeUsersRow(item, mode);
    case 'profiles':
      return sanitizeProfilesRow(item, mode);
    case 'refresh_tokens':
      return sanitizeRefreshTokensRow(item, mode);
    case 'products':
      return sanitizeProductsRow(item, mode);
    case 'banners':
      return sanitizeBannersRow(item, mode);
    case 'categories':
      return sanitizeCategoriesRow(item, mode);
    default: {
      // Drop undefined values; keep the rest for tables that accept flexible JSON.
      const copy = { ...item };
      // Common footgun across many tables: dual timestamp naming.
      if (copy.createdAt != null && copy.created_at == null && collectionName === 'users') {
        copy.created_at = copy.createdAt;
        delete copy.createdAt;
      }
      return copy;
    }
  }
}
