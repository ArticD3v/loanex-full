import { supabase } from '../lib/supabase';
import { WishlistItem, Product, ProductPhoto, DealerSource } from '../types';

function mapWishlistItem(data: any, product?: Product): WishlistItem {
  return {
    id: data.id,
    userId: data.user_id,
    productId: data.product_id,
    product,
    createdAt: data.created_at,
  };
}

export async function getWishlist(userId: string): Promise<WishlistItem[]> {
  const { data } = await supabase
    .from('wishlist_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!data || data.length === 0) return [];

  const productIds = data.map(w => w.product_id);
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .in('id', productIds);

  const productMap: Record<string, Product> = {};
  if (products) {
    const ids = products.map(p => p.id);
    const [photosRes, dealerRes] = await Promise.all([
      supabase.from('product_photos').select('*').in('product_id', ids).order('sort_order', { ascending: true }),
      supabase.from('product_dealers').select('purchase_price, dealers!inner(*)').in('product_id', ids),
    ]);

    const photosByProduct: Record<string, ProductPhoto[]> = {};
    (photosRes.data || []).forEach(ph => {
      if (!photosByProduct[ph.product_id]) photosByProduct[ph.product_id] = [];
      photosByProduct[ph.product_id].push({ id: ph.id, url: ph.url, order: ph.sort_order, isCover: ph.is_cover });
    });

    const dealersByProduct: Record<string, DealerSource[]> = {};
    (dealerRes.data || []).forEach((pd: any) => {
      if (!dealersByProduct[pd.product_id]) dealersByProduct[pd.product_id] = [];
      dealersByProduct[pd.product_id].push({
        id: pd.dealers.id,
        dealerCode: pd.dealers.dealer_code,
        dealerName: pd.dealers.dealer_name,
        dealerAddress: pd.dealers.dealer_address,
        dealerMobile: pd.dealers.dealer_mobile,
        purchasePrice: pd.purchase_price,
      });
    });

    products.forEach(p => {
      productMap[p.id] = {
        id: p.id, name: p.name, shortName: '', sku: p.sku, barcode: p.barcode || '',
        hsnCode: '', gstPercentage: 0, price: p.price, originalPrice: p.original_price,
        category: '', categoryId: p.category_id, subCategoryId: undefined,
        image: p.image, photos: photosByProduct[p.id] || [], videoUrl: '',
        rating: p.rating, reviews: p.reviews,
        description: p.description, descriptionShort: '', brand: p.brand, brandId: undefined,
        manufacturerId: undefined, features: [], boxContents: [], usageInstructions: '',
        stock: p.stock, status: p.status,
        emiAvailable: p.emi_available, emiPlanMode: p.emi_plan_mode, tenureOptions: p.tenure_options || [],
        downPayment: p.down_payment, minDownPayment: 0, maxDownPayment: 0,
        downPaymentType: p.down_payment_type, firstPaymentRule: p.first_payment_rule,
        serviceCharge: p.service_charge, deliveryCharge: p.delivery_charge,
        processingCharge: 0, verificationCharge: 0, documentationCharge: 0,
        gracePeriod: 0, firstEmiDate: '',
        dealers: dealersByProduct[p.id] || [], suppliers: [],
        warehouseId: undefined,
        purchasePrice: 0, procurementCost: 0, packagingCost: 0, transportCost: 0,
        loadingCost: 0, otherCharges: 0, landingCost: 0, mrp: 0,
        discount: 0, discountPercent: 0, grossMargin: 0, grossMarginPercent: 0,
        taxableValue: 0, gstAmount: 0, finalPrice: 0,
        reservedStock: 0, minStock: 0, maxStock: 0, reorderLevel: 0,
        weight: 0, length: 0, width: 0, height: 0,
        deliveryZone: '', deliveryPartner: '', estDeliveryDays: 0, returnWindow: 0,
        replacementAllowed: true, codAllowed: true,
        installationRequired: false, installationCharges: 0,
        countryOfOrigin: 'India', warranty: '', condition: 'new', serialTracking: false,
        minQuantity: 1, maxQuantity: 999, minCustomerAge: 0, eligiblePincodes: [],
        cashPurchaseAllowed: true, emiPurchaseAllowed: true,
        returnAllowed: false, serialCaptureRequired: false, fieldVerificationRequired: false,
        seoTitle: '', seoDescription: '', seoKeywords: '', slug: '',
        visibility: 'visible',
        featured: false, trending: false, recommended: false,
        createdAt: p.created_at,
      };
    });
  }

  return data.map(w => mapWishlistItem(w, productMap[w.product_id]));
}

export async function addToWishlist(userId: string, productId: string): Promise<void> {
  const { data: existing } = await supabase
    .from('wishlist_items')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (!existing) {
    await supabase.from('wishlist_items').insert({ user_id: userId, product_id: productId });
  }
}

export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  await supabase
    .from('wishlist_items')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);
}

export async function isInWishlist(userId: string, productId: string): Promise<boolean> {
  const { data } = await supabase
    .from('wishlist_items')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  return !!data;
}
