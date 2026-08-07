import { ProductCardItem } from '../../../shared/models/product-card.model';
import { formatInr } from '../../../shared/utils/currency';
import { CatalogProduct } from '../services/products-api.service';
import { calculateEmiBreakdown } from './emi-calc.helper';

export function toProductCardItem(product: CatalogProduct): ProductCardItem {
  const sellingPrice = product.sellingPrice ?? product.price;
  // Prefer API-computed starting EMI; otherwise estimate 12-mo plan with 20% DP, 0 fee.
  const emiMonthly =
    product.emiStartingFrom != null
      ? product.emiStartingFrom
      : calculateEmiBreakdown({
          productPrice: sellingPrice,
          downPayment: Math.round(sellingPrice * 0.2),
          processingFee: 0,
          tenureMonths: 12,
        }).monthlyEmi;

  return {
    id: product.id,
    name: product.name,
    price: sellingPrice,
    priceLabel: formatInr(sellingPrice),
    emiLabel: product.emiAvailable ? `${formatInr(emiMonthly)} / month` : 'EMI not available',
    deliveryLabel:
      product.deliveryCharge > 0 ? `Delivery ${formatInr(product.deliveryCharge)}` : 'Free Delivery',
    imageSrc: product.imageUrl || product.thumbnail,
    imageAlt: product.name,
    path: `/products/${product.id}`,
    rating: product.averageRating,
    reviewCount: product.reviewCount,
    wishlist: false,
  };
}
