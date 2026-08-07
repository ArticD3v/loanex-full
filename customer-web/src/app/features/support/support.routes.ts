import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const SUPPORT_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/contact-support/contact-support').then((m) => m.ContactSupportComponent),
    title: 'Contact Support — LoanEx',
  },
];
