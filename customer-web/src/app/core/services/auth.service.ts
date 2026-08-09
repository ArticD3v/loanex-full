import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  filter,
  finalize,
  firstValueFrom,
  map,
  of,
  shareReplay,
  take,
  tap,
  throwError,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiSuccess,
  AuthUser,
  ForgotPasswordResponse,
  LoginResponse,
  OtpPurpose,
  RefreshTokenResponse,
  RegisterResponse,
  ResetPasswordResponse,
  SendOtpResponse,
  CompleteRegistrationResponse,
  VerifyOtpSuccessResponse,
} from '../models/auth.models';
import { TokenService } from './token.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/auth`;
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly readySignal = signal(false);
  private returnUrl = '/';
  private refreshInFlight$: Observable<RefreshTokenResponse> | null = null;
  private loginRedirectScheduled = false;

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly user = this.tokens.user;
  readonly isAuthenticated = computed(() => this.tokens.hasAccessToken());
  readonly authReady = this.readySignal.asReadonly();
  private readonly ready$ = toObservable(this.readySignal);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      // SSR/prerender has no localStorage — do not treat as logged out in a sticky way.
      this.readySignal.set(true);
      return;
    }
    void this.initializeAuth();
  }

  /** Completes once when auth restoration has finished (success or keep/clear decision). */
  whenReady(): Observable<true> {
    if (this.readySignal()) {
      return of(true);
    }
    return this.ready$.pipe(
      filter((ready): ready is true => ready === true),
      take(1),
      map(() => true as const),
    );
  }

  fetchMe(): Observable<AuthUser | null> {
    if (!this.tokens.hasAccessToken()) {
      return throwError(() => new Error('Not authenticated'));
    }
    return this.http.get<ApiSuccess<{ user: AuthUser }>>(`${this.baseUrl}/me`).pipe(
      map((res) => res.data.user),
      tap((user) => {
        if (user) {
          this.tokens.setUser(user);
        }
      }),
      catchError((err) => throwError(() => err)),
    );
  }

  /**
   * Only allow same-app relative paths. Reject protocol-relative (`//evil`)
   * and absolute URLs to prevent open redirects.
   */
  sanitizeReturnUrl(url: string | null | undefined): string | null {
    if (url == null || url === '') return null;
    const trimmed = String(url).trim();
    if (!trimmed.startsWith('/')) return null;
    if (trimmed.startsWith('//')) return null;
    if (trimmed.startsWith('/\\')) return null;
    if (trimmed.includes('://')) return null;
    if (trimmed === '/auth' || trimmed.startsWith('/auth/')) return null;
    return trimmed;
  }

  setReturnUrl(url: string | null | undefined): void {
    if (url == null || url === '') {
      this.returnUrl = '/';
      return;
    }
    const safe = this.sanitizeReturnUrl(url);
    if (safe) {
      this.returnUrl = safe;
    }
  }

  getReturnUrl(): string {
    return this.sanitizeReturnUrl(this.returnUrl) || '/';
  }

  clearReturnUrl(): void {
    this.returnUrl = '/';
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  updateUser(data: { fullName?: string; email?: string; mobile?: string }): void {
    const current = this.tokens.user();
    if (current) {
      const updated: AuthUser = {
        ...current,
        fullName: data.fullName ?? current.fullName,
        email: data.email ?? current.email,
        mobile: data.mobile ?? current.mobile,
      };
      this.tokens.setUser(updated);
    }
  }

  register(payload: {
    fullName: string;
    mobile: string;
    email: string;
    password: string;
  }): Observable<RegisterResponse> {
    return this.run(
      this.http
        .post<ApiSuccess<RegisterResponse>>(`${this.baseUrl}/register`, payload)
        .pipe(map((res) => res.data)),
    );
  }

  login(payload: { identifier: string; password: string }): Observable<LoginResponse> {
    return this.run(
      this.http
        .post<ApiSuccess<LoginResponse>>(`${this.baseUrl}/login`, payload, {
          withCredentials: true,
        })
        .pipe(
          map((res) => res.data),
          tap((data) => {
            if (!data.requiresOtp && data.accessToken && data.user) {
              // Refresh may be HttpOnly-cookie-only; still persist access + user.
              this.persistSession(data.accessToken, data.refreshToken ?? '', data.user);
              this.loginRedirectScheduled = false;
            }
          }),
        ),
    );
  }

  sendOtp(payload: {
    mobile: string;
    purpose: OtpPurpose;
    otpChallenge?: string;
  }): Observable<SendOtpResponse> {
    return this.run(
      this.http
        .post<ApiSuccess<SendOtpResponse>>(`${this.baseUrl}/send-otp`, payload)
        .pipe(map((res) => res.data)),
    );
  }

  verifyOtp(payload: {
    mobile: string;
    otp: string;
    purpose: OtpPurpose;
    otpChallenge?: string;
  }): Observable<VerifyOtpSuccessResponse> {
    return this.run(
      this.http
        .post<ApiSuccess<VerifyOtpSuccessResponse>>(`${this.baseUrl}/verify-otp`, payload, {
          withCredentials: true,
        })
        .pipe(
          map((res) => res.data),
          tap((data) => {
            // Only persist session when tokens are issued (not mid-signup profile step).
            if (!data.requiresProfile && data.accessToken && data.user) {
              this.persistSession(data.accessToken, data.refreshToken ?? '', data.user);
              this.loginRedirectScheduled = false;
            }
          }),
        ),
    );
  }

  completeRegistration(payload: {
    registrationToken: string;
    fullName: string;
    email: string;
    password: string;
    dob?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  }): Observable<CompleteRegistrationResponse> {
    return this.run(
      this.http
        .post<ApiSuccess<CompleteRegistrationResponse>>(
          `${this.baseUrl}/complete-registration`,
          payload,
          { withCredentials: true },
        )
        .pipe(
          map((res) => res.data),
          tap((data) => {
            if (data.accessToken && data.user) {
              this.persistSession(data.accessToken, data.refreshToken ?? '', data.user);
              this.loginRedirectScheduled = false;
            }
          }),
        ),
    );
  }

  forgotPassword(payload: { mobile: string }): Observable<ForgotPasswordResponse> {
    return this.run(
      this.http
        .post<ApiSuccess<ForgotPasswordResponse>>(`${this.baseUrl}/forgot-password`, payload)
        .pipe(map((res) => res.data)),
    );
  }

  resetPassword(payload: {
    mobile: string;
    otp: string;
    newPassword: string;
  }): Observable<ResetPasswordResponse> {
    return this.run(
      this.http
        .post<ApiSuccess<ResetPasswordResponse>>(`${this.baseUrl}/reset-password`, payload)
        .pipe(map((res) => res.data)),
    );
  }

  /**
   * Shared single-flight refresh. Constructor restoration and the 401 interceptor
   * must both call this so the rotating refresh token is never used twice concurrently.
   */
  refreshToken(): Observable<RefreshTokenResponse> {
    if (!this.refreshInFlight$) {
      const refreshToken = this.tokens.refreshToken();
      const body = refreshToken ? { refreshToken } : {};

      this.refreshInFlight$ = this.http
        .post<ApiSuccess<RefreshTokenResponse>>(`${this.baseUrl}/refresh-token`, body, {
          withCredentials: true,
        })
        .pipe(
          map((res) => res.data),
          tap((data) => {
            this.persistSession(data.accessToken, data.refreshToken, data.user);
            this.loginRedirectScheduled = false;
          }),
          catchError((err: unknown) => {
            if (this.isDefinitiveAuthFailure(err)) {
              this.tokens.clear();
            }
            return throwError(() => err);
          }),
          finalize(() => {
            this.refreshInFlight$ = null;
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }

    return this.refreshInFlight$;
  }

  logout(): Observable<{ loggedOut: boolean; message: string }> {
    const refreshToken = this.tokens.refreshToken();
    const body = refreshToken ? { refreshToken } : {};
    const request$ = this.http
      .post<ApiSuccess<{ loggedOut: boolean; message: string }>>(
        `${this.baseUrl}/logout`,
        body,
        { withCredentials: true },
      )
      .pipe(map((res) => res.data));

    return request$.pipe(
      tap(() => {
        this.tokens.clear();
        this.clearReturnUrl();
      }),
      catchError((err) => {
        this.tokens.clear();
        this.clearReturnUrl();
        return throwError(() => err);
      }),
    );
  }

  redirectAfterAuth(): void {
    const target = this.getReturnUrl();
    this.clearReturnUrl();
    void this.router.navigateByUrl(target);
  }

  /** Navigate to login at most once per auth-loss episode. */
  redirectToLogin(returnUrl?: string): void {
    if (this.loginRedirectScheduled) return;
    const current = this.router.url || '';
    if (current === '/auth/login' || current.startsWith('/auth/login?')) return;

    this.loginRedirectScheduled = true;
    const safe = this.sanitizeReturnUrl(returnUrl);
    if (safe) {
      this.setReturnUrl(safe);
    }
    void this.router.navigate(['/auth/login'], {
      queryParams: safe ? { returnUrl: safe } : undefined,
    });
  }

  isDefinitiveAuthFailure(err: unknown): boolean {
    if (!(err instanceof HttpErrorResponse)) {
      return false;
    }
    if (err.status === 401 || err.status === 403) {
      return true;
    }
    // Refresh with missing/invalid cookie often returns 400 from our API.
    if (err.status === 400) {
      const message = String(
        (err.error as { message?: string } | null)?.message ?? err.message ?? '',
      ).toLowerCase();
      return (
        message.includes('refresh token') ||
        message.includes('unauthorized') ||
        message.includes('invalid or expired')
      );
    }
    return false;
  }

  private async initializeAuth(): Promise<void> {
    try {
      if (!this.tokens.hasAccessToken()) {
        return;
      }

      if (!this.tokens.hasValidAccessToken()) {
        try {
          await firstValueFrom(this.refreshToken());
        } catch (err) {
          // refreshToken() already cleared on definitive auth failure.
          if (this.isDefinitiveAuthFailure(err)) {
            return;
          }
          // Transient refresh failure — keep existing local session for retry later.
          return;
        }
        await this.safeFetchMe();
        return;
      }

      await this.safeFetchMe();
    } finally {
      this.readySignal.set(true);
    }
  }

  /** Load /me; on 401 try one shared refresh; never clear on transient errors. */
  private async safeFetchMe(): Promise<void> {
    try {
      await firstValueFrom(this.fetchMe());
    } catch (err) {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        // Network / 404 / 5xx — keep local session.
        return;
      }

      try {
        await firstValueFrom(this.refreshToken());
        await firstValueFrom(
          this.fetchMe().pipe(
            catchError((meErr) => {
              // Session was refreshed; keep tokens even if /me is temporarily unhealthy.
              if (this.isDefinitiveAuthFailure(meErr) && meErr instanceof HttpErrorResponse && meErr.status === 401) {
                // Fresh access token still rejected — session is not usable.
                this.tokens.clear();
              }
              return of(null);
            }),
          ),
        );
      } catch {
        // refreshToken() already cleared on definitive auth failure;
        // transient failures keep the prior local session.
      }
    }
  }

  private persistSession(accessToken: string, refreshToken: string, user: AuthUser): void {
    this.tokens.setSession(accessToken, refreshToken, user);
  }

  private run<T>(source$: Observable<T>): Observable<T> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return source$.pipe(
      tap({
        next: () => this.loadingSignal.set(false),
        error: (err: unknown) => {
          this.loadingSignal.set(false);
          this.errorSignal.set(this.extractError(err));
        },
      }),
      catchError((err) => throwError(() => err)),
    );
  }

  private extractError(err: unknown): string {
    const httpErr = err as {
      error?: { message?: string; details?: Array<{ message: string }> };
      message?: string;
    };

    if (httpErr?.error?.details?.length) {
      return httpErr.error.details.map((d) => d.message).join('. ');
    }

    return httpErr?.error?.message || httpErr?.message || 'Something went wrong. Please try again.';
  }
}
