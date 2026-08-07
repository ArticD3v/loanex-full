import { Injectable, signal } from '@angular/core';
import { AuthUser } from '../models/auth.models';

const ACCESS_KEY = 'loanex.accessToken';
const REFRESH_KEY = 'loanex.refreshToken';
const USER_KEY = 'loanex.user';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly accessTokenSignal = signal<string | null>(this.read(ACCESS_KEY));
  private readonly refreshTokenSignal = signal<string | null>(this.read(REFRESH_KEY));
  private readonly userSignal = signal<AuthUser | null>(this.readUser());

  readonly accessToken = this.accessTokenSignal.asReadonly();
  readonly refreshToken = this.refreshTokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();

  setSession(accessToken: string, refreshToken: string, user: AuthUser): void {
    this.write(ACCESS_KEY, accessToken);
    this.write(REFRESH_KEY, refreshToken);
    this.write(USER_KEY, JSON.stringify(user));
    this.accessTokenSignal.set(accessToken);
    this.refreshTokenSignal.set(refreshToken);
    this.userSignal.set(user);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.write(ACCESS_KEY, accessToken);
    this.write(REFRESH_KEY, refreshToken);
    this.accessTokenSignal.set(accessToken);
    this.refreshTokenSignal.set(refreshToken);
  }

  setUser(user: AuthUser): void {
    this.write(USER_KEY, JSON.stringify(user));
    this.userSignal.set(user);
  }

  clear(): void {
    this.remove(ACCESS_KEY);
    this.remove(REFRESH_KEY);
    this.remove(USER_KEY);
    this.accessTokenSignal.set(null);
    this.refreshTokenSignal.set(null);
    this.userSignal.set(null);
  }

  hasAccessToken(): boolean {
    return !!this.accessTokenSignal();
  }

  private read(key: string): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(key);
  }

  private write(key: string, value: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(key, value);
  }

  private remove(key: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.removeItem(key);
  }

  private readUser(): AuthUser | null {
    const raw = this.read(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}
