import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';

let refreshInFlight: ReturnType<AuthService['refreshToken']> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenService);
  const auth = inject(AuthService);
  const accessToken = tokens.accessToken();

  const isAuthApi = req.url.includes('/api/v1/auth/');
  const isRefresh = req.url.includes('/api/v1/auth/refresh-token');

  const authReq =
    accessToken && !isAuthApi
      ? req.clone({
          setHeaders: { Authorization: `Bearer ${accessToken}` },
        })
      : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isRefresh) {
        return throwError(() => error);
      }

      const refreshToken = tokens.refreshToken();
      if (!refreshToken) {
        tokens.clear();
        return throwError(() => error);
      }

      if (!refreshInFlight) {
        refreshInFlight = auth.refreshToken().pipe(
          catchError((refreshError) => {
            tokens.clear();
            refreshInFlight = null;
            return throwError(() => refreshError);
          }),
        );
      }

      return refreshInFlight.pipe(
        switchMap((data) => {
          refreshInFlight = null;
          const retry = req.clone({
            setHeaders: { Authorization: `Bearer ${data.accessToken}` },
          });
          return next(retry);
        }),
      );
    }),
  );
};
