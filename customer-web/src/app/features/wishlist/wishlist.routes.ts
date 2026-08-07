import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const WISHLIST_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/wishlist/wishlist').then((m) => m.WishlistComponent),
    title: 'My Wishlist — LoanEx',
  },
];
