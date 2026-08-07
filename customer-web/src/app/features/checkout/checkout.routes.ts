import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const CHECKOUT_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/checkout-summary/checkout-summary').then(
        (m) => m.CheckoutSummaryComponent,
      ),
    title: 'Checkout — LoanEx',
  },
  {
    path: 'personal-details',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/personal-details/personal-details').then(
        (m) => m.PersonalDetailsComponent,
      ),
    title: 'Personal Information — LoanEx',
  },
  {
    path: 'payment',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/direct-payment/direct-payment').then((m) => m.DirectPaymentComponent),
    title: 'Direct Payment — LoanEx',
  },
];
