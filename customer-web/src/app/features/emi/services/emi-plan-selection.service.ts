import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccess } from '../../../core/models/auth.models';
import { AuthService } from '../../../core/services/auth.service';

export interface EmiPlanSelection {
  productId: string;
  variantId?: string;
  productName: string;
  sellingPrice: number;
  requestedAmount: number;
  requestedDownPayment: number;
  requestedTenure: number;
  estimatedMonthlyEmi: number;
}

const STORAGE_KEY = 'loanex.emiPlanSelection';

@Injectable({ providedIn: 'root' })
export class EmiPlanSelectionService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/emi/applications`;
  private readonly selectionSignal = signal<EmiPlanSelection | null>(this.readLocal());

  readonly selection = this.selectionSignal.asReadonly();

  save(selection: EmiPlanSelection): void {
    this.selectionSignal.set(selection);
    this.writeLocal(selection);
    // Durable Mongo draft (best-effort — local copy remains for offline resume).
    if (this.auth.isAuthenticated()) {
      this.http
        .put<ApiSuccess<{ saved: boolean; plan: EmiPlanSelection }>>(
          `${this.baseUrl}/plan-draft`,
          selection,
        )
        .subscribe({ error: () => undefined });
    }
  }

  get(): EmiPlanSelection | null {
    return this.selectionSignal() ?? this.readLocal();
  }

  /** Load local → Mongo draft → open application recovery. */
  loadDurable(): Observable<EmiPlanSelection | null> {
    const local = this.get();
    if (local?.productId) {
      return of(local);
    }
    if (!this.auth.isAuthenticated()) {
      return of(null);
    }
    return this.http
      .get<ApiSuccess<{ plan: EmiPlanSelection | null }>>(`${this.baseUrl}/plan-draft`)
      .pipe(
        map((res) => res.data?.plan ?? null),
        tap((plan) => {
          if (plan?.productId) {
            this.selectionSignal.set(plan);
            this.writeLocal(plan);
          }
        }),
        catchError(() => of(null)),
      );
  }

  clear(): void {
    this.selectionSignal.set(null);
    this.removeLocal();
    if (this.auth.isAuthenticated()) {
      this.http.delete(`${this.baseUrl}/plan-draft`).subscribe({ error: () => undefined });
    }
  }

  private storageKey(): string {
    const userId = this.auth.user()?.id;
    return userId ? `${STORAGE_KEY}.${userId}` : STORAGE_KEY;
  }

  private writeLocal(selection: EmiPlanSelection): void {
    if (typeof localStorage === 'undefined') return;
    const raw = JSON.stringify(selection);
    localStorage.setItem(this.storageKey(), raw);
    // Keep legacy session key for same-tab continuity during migration.
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, raw);
    }
  }

  private removeLocal(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey());
      localStorage.removeItem(STORAGE_KEY);
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  private readLocal(): EmiPlanSelection | null {
    const tryParse = (raw: string | null): EmiPlanSelection | null => {
      if (!raw) return null;
      try {
        return JSON.parse(raw) as EmiPlanSelection;
      } catch {
        return null;
      }
    };
    if (typeof localStorage !== 'undefined') {
      const keyed = tryParse(localStorage.getItem(this.storageKey()));
      if (keyed?.productId) return keyed;
      const legacy = tryParse(localStorage.getItem(STORAGE_KEY));
      if (legacy?.productId) return legacy;
    }
    if (typeof sessionStorage !== 'undefined') {
      return tryParse(sessionStorage.getItem(STORAGE_KEY));
    }
    return null;
  }
}
