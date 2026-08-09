import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';

/** Auth routes that must NOT receive the access-token Bearer header. */
const PUBLIC_AUTH_PATH =
  /\/api\/v1\/auth\/(login|admin-login|register|send-otp|verify-otp|complete-registration|forgot-password|reset-password|refresh-token|logout)(?:\?|$)/i;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenService);
  const auth = inject(AuthService);
  const router = inject(Router);
  const accessToken = tokens.accessToken();

  const isRefresh = req.url.includes('/api/v1/auth/refresh-token');
  const isPublicAuth = PUBLIC_AUTH_PATH.test(req.url);
  const isMe = /\/api\/v1\/auth\/me(?:\?|$)/i.test(req.url);

  const authReq =
    accessToken && !isPublicAuth
      ? req.clone({
          setHeaders: { Authorization: `Bearer ${accessToken}` },
          withCredentials: true,
        })
      : req.clone({ withCredentials: true });

  return next(authReq).pipe(
    catchError((error: unknown) => {
      // Never try token refresh for public auth calls (e.g. failed login 401).
      // Otherwise refresh fails with "Refresh token is required" and hides the real error.
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        isRefresh ||
        isPublicAuth
      ) {
        return throwError(() => error);
      }

      // During bootstrap restore, /me 401 is handled by AuthService.initializeAuth
      // via the same shared refresh — avoid a second competing refresh here.
      if (isMe && !auth.authReady()) {
        return throwError(() => error);
      }

      // Shared single-flight refresh (same Observable as AuthService constructor).
      return auth.refreshToken().pipe(
        switchMap((data) => {
          const retry = req.clone({
            setHeaders: { Authorization: `Bearer ${data.accessToken}` },
            withCredentials: true,
          });
          return next(retry);
        }),
        catchError((refreshError: unknown) => {
          if (auth.isDefinitiveAuthFailure(refreshError)) {
            // tokens.clear() already performed inside AuthService.refreshToken on auth failure.
            const returnUrl =
              router.url && !router.url.startsWith('/auth/login') ? router.url : undefined;
            auth.redirectToLogin(returnUrl);
          }
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
