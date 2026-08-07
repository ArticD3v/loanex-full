import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const ORDERS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/my-orders/my-orders').then((m) => m.MyOrdersComponent),
    title: 'My Orders — LoanEx',
  },
];
