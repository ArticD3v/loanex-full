import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const VERIFICATION_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/identity-verification/identity-verification').then(
        (m) => m.IdentityVerificationComponent,
      ),
    title: 'Identity Verification — LoanEx',
  },
  {
    path: 'pan',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'bank',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'summary',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/verification-summary/verification-summary').then(
        (m) => m.VerificationSummaryComponent,
      ),
    title: 'Verification Summary — LoanEx',
  },
];
