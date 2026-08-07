export interface ProductImage {
  id: string;
  src: string;
  alt: string;
}

export interface ProductColorOption {
  id: string;
  name: string;
  hex: string;
}

export interface ProductVariantOption {
  id: string;
  label: string;
}

export interface ProductKeySpec {
  id: string;
  icon: string;
  label: string;
  value: string;
}

export interface ProductSpecRow {
  label: string;
  value: string;
}

export interface ProductReviewHighlight {
  id: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  dateLabel: string;
}

export interface ProductQaItem {
  id: string;
  question: string;
  answer: string;
}

export interface TrustBadge {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
}

export interface DeliveryStep {
  id: string;
  icon: string;
  label: string;
  description: string;
}

export interface BreadcrumbTrailItem {
  label: string;
  path?: string;
}

export interface VariantAttributeOption {
  value: string;
  label: string;
  hex: string | null;
  inStock: boolean;
  disabled: boolean;
}

export interface VariantAttributeGroup {
  key: string;
  label: string;
  type: 'swatch' | 'chip' | string;
  options: VariantAttributeOption[];
}

export interface ProductVariantSku {
  id: string;
  productId: string;
  sku: string;
  variantName: string;
  price: number;
  discountPrice: number | null;
  sellingPrice: number;
  mrp: number;
  discount: number;
  stock: number;
  stockQuantity: number;
  inStock: boolean;
  images: string[];
  imagesGallery: ProductImage[];
  thumbnail: string | null;
  keySpecs: ProductKeySpec[];
  specificationRows: ProductSpecRow[];
  attributes: Record<string, string>;
  isDefault: boolean;
}

export interface ProductDetails {
  id: string;
  name: string;
  /** Original catalog product name (never mutated by variant selection). */
  baseName: string;
  brand: string;
  categoryLabel: string;
  subcategoryLabel: string;
  price: number;
  mrp?: number;
  rating: number;
  reviewCount: number;
  answeredQuestions: number;
  inStock: boolean;
  stockQuantity: number;
  sku: string;
  deliveryPincode: string;
  warrantyLabel: string;
  images: ProductImage[];
  colors: ProductColorOption[];
  variants: ProductVariantOption[];
  attributeGroups: VariantAttributeGroup[];
  productVariants: ProductVariantSku[];
  selectedVariantId: string | null;
  keySpecs: ProductKeySpec[];
  overviewTitle: string;
  overviewBody: string;
  baseOverviewBody: string;
  overviewHighlights: string[];
  specifications: ProductSpecRow[];
  reviews: ProductReviewHighlight[];
  returnsPolicy: string[];
  questions: ProductQaItem[];
  breadcrumbs: BreadcrumbTrailItem[];
  emiPlans?: ProductEmiPlan[];
}

export interface ProductEmiPlan {
  id: string;
  planName?: string;
  months: number;
  downPayment: number;
  serviceCharge: number;
  deliveryCharge: number;
  minEligibilityAmount: number;
  customerVisibility?: string;
  isRecommended: boolean;
}

export interface EmiTenureOption {
  label: string;
  value: number;
}

export interface EmiDownPaymentOption {
  label: string;
  value: number;
}

export interface EmiPlanCard {
  months: number;
  monthlyEmi: number;
  processingFee: number;
  downPayment: number;
  totalPayable: number;
  recommended: boolean;
}

export interface EmiPlanSummary {
  productPrice: number;
  downPayment: number;
  processingFee: number;
  monthlyEmi: number;
  totalPayable: number;
}
