export interface HomeCategory {
  id: string;
  label: string;
  /** Category name passed as `/products?category=` query param. */
  category: string;
  imageSrc: string;
  imageAlt: string;
}

export interface PopularProduct {
  id: string;
  name: string;
  priceLabel: string;
  emiLabel: string;
  deliveryLabel: string;
  imageSrc: string;
  imageAlt: string;
  path: string;
  wishlist: boolean;
}
