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
    role_id: item.role_id ?? item.roleId ?? undefined,
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

function sanitizeRolesRow(item: Record<string, any>, mode: 'insert' | 'update'): Record<string, any> {
  const now = new Date().toISOString();
  return pickDefined({
    ...(mode === 'insert' && item.id != null && String(item.id).trim() !== ''
      ? { id: String(item.id) }
      : {}),
    name: item.name,
    description: item.description ?? '',
    permissions: Array.isArray(item.permissions) ? item.permissions : [],
    is_system: Boolean(item.is_system ?? item.isSystem ?? false),
    created_at: item.created_at ?? item.createdAt ?? (mode === 'insert' ? now : undefined),
    updated_at: item.updated_at ?? item.updatedAt ?? now,
  });
}

function sanitizeProfilesRow(item: Record<string, any>, mode: 'insert' | 'update'): Record<string, any> {
  const now = new Date().toISOString();
  const fullName = item.full_name ?? item.fullName;
  return pickDefined({
    ...(mode === 'insert' && item.id != null ? { id: item.id } : {}),
    mobile_number: item.mobile_number ?? item.mobileNumber,
    // public.profiles uses snake_case full_name (not fullName).
    full_name: fullName,
    email: item.email,
    dob: item.dob,
    gender: item.gender,
    kyc_status: item.kyc_status ?? item.kycStatus,
    branches: item.branches,
    pincodes: item.pincodes,
    created_at: item.created_at ?? item.createdAt ?? (mode === 'insert' ? now : undefined),
    updated_at: item.updated_at ?? item.updatedAt ?? now,
  });
}

/** Normalize hydrated address rows so ownership lookups use camelCase consistently. */
export function normalizeAddressRow(row: Record<string, any>): Record<string, any> {
  if (!row || typeof row !== 'object') return row;
  const userId = row.userId ?? row.user_id ?? null;
  const profileId = row.profileId ?? row.profile_id ?? userId;
  return {
    ...row,
    userId,
    user_id: userId,
    profileId,
    profile_id: profileId,
    house_number: row.house_number ?? row.addressLine1 ?? null,
    street: row.street ?? row.addressLine2 ?? null,
    fullAddress: row.fullAddress ?? row.full_address ?? null,
    full_address: row.full_address ?? row.fullAddress ?? null,
    addressType: row.addressType ?? row.label ?? 'SHIPPING',
    label: row.label ?? row.addressType ?? 'SHIPPING',
    is_default: Boolean(row.is_default),
    createdAt: row.createdAt ?? row.created_at ?? null,
    updatedAt: row.updatedAt ?? row.updated_at ?? null,
  };
}

function sanitizeAddressesRow(item: Record<string, any>, mode: 'insert' | 'update'): Record<string, any> {
  const now = new Date().toISOString();
  const userId = item.userId ?? item.user_id;
  const profileId = item.profileId ?? item.profile_id ?? userId;
  const label = item.label ?? item.addressType ?? 'SHIPPING';
  return pickDefined({
    ...(mode === 'insert' && item.id != null && isUuid(item.id) ? { id: item.id } : {}),
    profile_id: isUuid(profileId) ? profileId : undefined,
    user_id: isUuid(userId) ? userId : undefined,
    label,
    receiver_name: item.receiver_name ?? item.receiverName ?? undefined,
    mobile_number: item.mobile_number ?? item.mobileNumber ?? undefined,
    house_number: item.house_number ?? item.addressLine1,
    apartment: item.apartment ?? undefined,
    street: item.street ?? item.addressLine2,
    area: item.area ?? undefined,
    landmark: item.landmark ?? null,
    city: item.city,
    state: item.state,
    pincode: item.pincode,
    is_default: Boolean(item.is_default),
    is_residential_verified: item.is_residential_verified ?? item.isResidentialVerified ?? undefined,
    full_address: item.full_address ?? item.fullAddress ?? undefined,
    created_at: item.created_at ?? item.createdAt ?? (mode === 'insert' ? now : undefined),
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
    variants: item.variants,
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
    placement: item.placement ?? 'home',
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
    parentId: item.parentId ?? item.parent_id ?? null,
    status: item.status ?? 'active',
    sortOrder: item.sortOrder ?? 0,
    createdAt: item.createdAt ?? (mode === 'insert' ? now : undefined),
  });
}

/**
 * Orders span two historical schemas (EMI tracking vs checkout ecommerce).
 * Send portable columns; mirrorInsert strips unknown ones on retry.
 * Always keep user ownership fields so GET /orders/:id survives hydrate.
 */
function sanitizeOrdersRow(item: Record<string, any>, mode: 'insert' | 'update'): Record<string, any> {
  const now = new Date().toISOString();
  const userId = item.userId ?? item.user_id;
  const profileId = item.profileId ?? item.profile_id ?? userId;
  const addressId = item.addressId ?? item.address_id;
  const total =
    item.totalAmount ?? item.total_amount ?? item.total ?? item.subtotal ?? 0;
  const rawStatus = String(
    item.orderStatus ?? item.status ?? item.payment_status ?? 'pending',
  );
  const statusUpper = rawStatus.toUpperCase();
  const statusLower = (() => {
    if (statusUpper.includes('DELIVER')) return 'delivered';
    if (statusUpper.includes('SHIP')) return 'shipped';
    if (statusUpper.includes('CANCEL')) return 'cancelled';
    if (statusUpper.includes('CONFIRM') || statusUpper === 'SUCCESS') return 'confirmed';
    return 'pending';
  })();
  const rawMethod = String(item.paymentMethod ?? item.payment_method ?? '').toUpperCase();
  const isEmi = rawMethod === 'EMI' || Boolean(item.applicationId);
  const paymentMethodLegacy = isEmi ? 'EMI' : 'FULL_PAYMENT';
  const paymentMethodSnake = isEmi ? 'emi' : 'cod';
  const items = Array.isArray(item.items)
    ? item.items
    : item.productId
      ? [{ productId: item.productId, quantity: item.quantity ?? 1, unitPrice: total }]
      : [];

  return pickDefined({
    ...(mode === 'insert' && item.id != null && isUuid(item.id) ? { id: item.id } : {}),
    userId,
    user_id: userId,
    profileId,
    profile_id: profileId,
    addressId: isUuid(addressId) ? addressId : undefined,
    address_id: isUuid(addressId) ? addressId : undefined,
    totalAmount: total,
    total_amount: total,
    subtotal: item.subtotal ?? total,
    total: item.total ?? total,
    paymentMethod: paymentMethodLegacy,
    payment_method: paymentMethodSnake,
    payment_status: item.payment_status ?? (statusLower === 'confirmed' ? 'SUCCESS' : 'PENDING'),
    status: statusLower,
    orderStatus: item.orderStatus ?? statusUpper,
    items,
    phone: item.phone != null && String(item.phone).trim() !== '' ? String(item.phone) : '0000000000',
    notes: item.notes ?? null,
    addressSnapshot: item.addressSnapshot ?? item.address_snapshot ?? null,
    address_snapshot: item.addressSnapshot ?? item.address_snapshot ?? null,
    orderNumber: item.orderNumber,
    applicationId: isUuid(item.applicationId) ? item.applicationId : undefined,
    productId: item.productId,
    quantity: item.quantity ?? (items[0]?.quantity ?? 1),
    paymentTransactionId: item.paymentTransactionId,
    estimatedDeliveryDate: item.estimatedDeliveryDate,
    courierPartner: item.courierPartner,
    trackingNumber: item.trackingNumber,
    warehouse: item.warehouse,
    deliveryAddress: item.deliveryAddress,
    productBrand: item.productBrand,
    createdAt: item.createdAt ?? item.created_at ?? (mode === 'insert' ? now : undefined),
    created_at: item.created_at ?? item.createdAt ?? (mode === 'insert' ? now : undefined),
    updatedAt: item.updatedAt ?? item.updated_at ?? now,
    updated_at: item.updated_at ?? item.updatedAt ?? now,
  });
}

/** Normalize hydrated Supabase rows so in-memory lookups use camelCase ownership fields. */
export function normalizeOrderRow(row: Record<string, any>): Record<string, any> {
  if (!row || typeof row !== 'object') return row;
  const userId = row.userId ?? row.user_id ?? null;
  const profileId = row.profileId ?? row.profile_id ?? userId;
  return {
    ...row,
    userId,
    profileId,
    addressId: row.addressId ?? row.address_id ?? null,
    totalAmount: row.totalAmount ?? row.total_amount ?? row.total ?? 0,
    paymentMethod: row.paymentMethod ?? row.payment_method ?? null,
    orderStatus: row.orderStatus ?? row.status ?? null,
    createdAt: row.createdAt ?? row.created_at ?? null,
    updatedAt: row.updatedAt ?? row.updated_at ?? null,
    items: Array.isArray(row.items) ? row.items : [],
  };
}

/** Only columns on public.paymentTransaction — purpose/status break PostgREST. */
function sanitizePaymentTransactionRow(
  item: Record<string, any>,
  mode: 'insert' | 'update',
): Record<string, any> {
  const now = new Date().toISOString();
  return pickDefined({
    ...(mode === 'insert' && item.id != null && String(item.id).trim() !== ''
      ? { id: String(item.id) }
      : {}),
    applicationId: item.applicationId === undefined ? undefined : item.applicationId,
    userId: item.userId,
    razorpayOrderId: item.razorpayOrderId,
    razorpayPaymentId: item.razorpayPaymentId,
    razorpaySignature: item.razorpaySignature,
    amount: item.amount,
    currency: item.currency,
    paymentStatus: item.paymentStatus ?? item.status,
    paymentType: item.paymentType ?? item.purpose,
    receiptPath: item.receiptPath,
    refundId: item.refundId,
    refundStatus: item.refundStatus,
    refundAmount: item.refundAmount,
    emiScheduleId: item.emiScheduleId,
    paidAt: item.paidAt,
    createdAt: item.createdAt ?? (mode === 'insert' ? now : undefined),
    updatedAt: item.updatedAt ?? now,
  });
}

function sanitizeJobApplicationsRow(
  item: Record<string, any>,
  mode: 'insert' | 'update',
): Record<string, any> {
  const now = new Date().toISOString();
  return pickDefined({
    ...(mode === 'insert' && item.id != null && String(item.id).trim() !== ''
      ? { id: String(item.id) }
      : {}),
    jobId: item.jobId ?? item.job_id,
    fullName: item.fullName ?? item.full_name,
    email: item.email,
    phone: item.phone,
    location: item.location ?? null,
    experience: item.experience ?? null,
    currentJobTitle: item.currentJobTitle ?? item.current_job_title ?? null,
    skills: item.skills ?? null,
    resumeUrl: item.resumeUrl ?? item.resume_url,
    resumeFileName: item.resumeFileName ?? item.resume_file_name ?? null,
    linkedinUrl: item.linkedinUrl ?? item.linkedin_url ?? null,
    portfolioUrl: item.portfolioUrl ?? item.portfolio_url ?? null,
    about: item.about,
    status: item.status ?? 'Applied',
    createdAt: item.createdAt ?? (mode === 'insert' ? now : undefined),
    updatedAt: item.updatedAt ?? now,
  });
}

function sanitizeGeneralApplicationsRow(
  item: Record<string, any>,
  mode: 'insert' | 'update',
): Record<string, any> {
  const now = new Date().toISOString();
  return pickDefined({
    ...(mode === 'insert' && item.id != null && String(item.id).trim() !== ''
      ? { id: String(item.id) }
      : {}),
    fullName: item.fullName ?? item.full_name,
    email: item.email,
    phone: item.phone,
    location: item.location ?? null,
    experience: item.experience ?? null,
    currentJobTitle: item.currentJobTitle ?? item.current_job_title ?? null,
    skills: item.skills ?? null,
    preferredDepartment: item.preferredDepartment ?? item.preferred_department,
    resumeUrl: item.resumeUrl ?? item.resume_url,
    resumeFileName: item.resumeFileName ?? item.resume_file_name ?? null,
    linkedinUrl: item.linkedinUrl ?? item.linkedin_url ?? null,
    portfolioUrl: item.portfolioUrl ?? item.portfolio_url ?? null,
    about: item.about,
    status: item.status ?? 'Applied',
    createdAt: item.createdAt ?? (mode === 'insert' ? now : undefined),
    updatedAt: item.updatedAt ?? now,
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
    case 'roles':
      return sanitizeRolesRow(item, mode);
    case 'profiles':
      return sanitizeProfilesRow(item, mode);
    case 'addresses':
      return sanitizeAddressesRow(item, mode);
    case 'refresh_tokens':
      return sanitizeRefreshTokensRow(item, mode);
    case 'products':
      return sanitizeProductsRow(item, mode);
    case 'banners':
      return sanitizeBannersRow(item, mode);
    case 'categories':
      return sanitizeCategoriesRow(item, mode);
    case 'orders':
      return sanitizeOrdersRow(item, mode);
    case 'paymentTransaction':
      return sanitizePaymentTransactionRow(item, mode);
    case 'job_applications':
      return sanitizeJobApplicationsRow(item, mode);
    case 'general_applications':
      return sanitizeGeneralApplicationsRow(item, mode);
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
