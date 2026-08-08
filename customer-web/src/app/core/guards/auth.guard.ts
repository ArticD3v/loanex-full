import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  auth.setReturnUrl(state.url);
  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
};

export const guestGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true;
  }

  // Prefer intended destination from query or in-memory returnUrl — never force Home.
  const queryReturn = state.root.queryParamMap.get('returnUrl');
  if (queryReturn) {
    auth.setReturnUrl(queryReturn);
  }
  const target = auth.getReturnUrl();
  return router.parseUrl(target);
};
