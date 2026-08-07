import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
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

  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/auth`;
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private returnUrl = '/';

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly user = this.tokens.user;
  readonly isAuthenticated = computed(() => this.tokens.hasAccessToken());

  constructor() {
    if (this.tokens.hasAccessToken()) {
      this.fetchMe().subscribe({ error: () => {} });
    }
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

  setReturnUrl(url: string | null | undefined): void {
    if (url && url !== '/auth' && !url.startsWith('/auth/')) {
      this.returnUrl = url;
    }
  }

  getReturnUrl(): string {
    return this.returnUrl || '/';
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
        .post<ApiSuccess<LoginResponse>>(`${this.baseUrl}/login`, payload)
        .pipe(
          map((res) => res.data),
          tap((data) => {
            if (!data.requiresOtp && data.accessToken && data.refreshToken && data.user) {
              this.persistSession(data.accessToken, data.refreshToken, data.user);
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
        .post<ApiSuccess<VerifyOtpSuccessResponse>>(`${this.baseUrl}/verify-otp`, payload)
        .pipe(
          map((res) => res.data),
          tap((data) => {
            // Only persist session when tokens are issued (not mid-signup profile step).
            if (
              !data.requiresProfile &&
              data.accessToken &&
              data.refreshToken &&
              data.user
            ) {
              this.persistSession(data.accessToken, data.refreshToken, data.user);
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
        )
        .pipe(
          map((res) => res.data),
          tap((data) => {
            if (data.accessToken && data.refreshToken && data.user) {
              this.persistSession(data.accessToken, data.refreshToken, data.user);
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

  refreshToken(): Observable<RefreshTokenResponse> {
    const refreshToken = this.tokens.refreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('Missing refresh token'));
    }

    return this.http
      .post<ApiSuccess<RefreshTokenResponse>>(`${this.baseUrl}/refresh-token`, { refreshToken })
      .pipe(
        map((res) => res.data),
        tap((data) => this.persistSession(data.accessToken, data.refreshToken, data.user)),
      );
  }

  logout(): Observable<{ loggedOut: boolean; message: string }> {
    const refreshToken = this.tokens.refreshToken();
    const request$ = refreshToken
      ? this.http
          .post<ApiSuccess<{ loggedOut: boolean; message: string }>>(`${this.baseUrl}/logout`, {
            refreshToken,
          })
          .pipe(map((res) => res.data))
      : new Observable<{ loggedOut: boolean; message: string }>((subscriber) => {
          subscriber.next({ loggedOut: true, message: 'Logged out' });
          subscriber.complete();
        });

    return request$.pipe(
      tap(() => this.tokens.clear()),
      catchError((err) => {
        this.tokens.clear();
        return throwError(() => err);
      }),
    );
  }

  redirectAfterAuth(): void {
    const target = this.getReturnUrl();
    void this.router.navigateByUrl(target);
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
