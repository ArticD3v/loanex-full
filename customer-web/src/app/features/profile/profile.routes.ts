import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/my-profile/my-profile').then((m) => m.MyProfileComponent),
    title: 'My Profile — LoanEx',
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/settings/settings').then((m) => m.SettingsComponent),
    title: 'Settings — LoanEx',
  },
];
