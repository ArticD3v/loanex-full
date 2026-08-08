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
    path: 'digilocker-callback',
    // Public so DigiLocker return can always land here even mid-auth refresh;
    // it immediately routes to /verification (authGuard) with client_id.
    loadComponent: () =>
      import('./pages/digilocker-callback/digilocker-callback').then(
        (m) => m.DigilockerCallbackComponent,
      ),
    title: 'DigiLocker — LoanEx',
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
