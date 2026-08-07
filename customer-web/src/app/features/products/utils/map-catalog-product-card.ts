import { ProductCardItem } from '../../../shared/models/product-card.model';
import { formatInr } from '../../../shared/utils/currency';
import { CatalogProduct } from '../services/products-api.service';

export function toProductCardItem(product: CatalogProduct): ProductCardItem {
  const sellingPrice = product.sellingPrice ?? product.price;
  const emiMonthly =
    product.emiStartingFrom != null
      ? Math.ceil(product.emiStartingFrom)
      : Math.ceil(sellingPrice / 24);

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
