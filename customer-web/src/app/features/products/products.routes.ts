import { Routes } from '@angular/router';

export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/product-catalog/product-catalog').then((m) => m.ProductCatalogComponent),
    title: 'Shop — LoanEx',
  },
  {
    path: ':productId',
    loadComponent: () =>
      import('./product-details/product-details').then((m) => m.ProductDetails),
    title: 'Product Details — LoanEx',
  },
];
