import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccess } from '../../../core/models/auth.models';

export type PurchaseType = 'EMI' | 'DIRECT';

export interface CheckoutSummary {
  product: {
    id: string;
    name: string;
    brand: string;
    variant: string | null;
    variantId?: string | null;
    sku?: string;
    imageUrl: string;
    inStock: boolean;
    stockQuantity: number;
  };
  quantity: number;
  items?: Array<{
    product: {
      id: string;
      name: string;
      brand: string;
      variant: string | null;
      sku?: string;
      imageUrl: string;
      inStock: boolean;
      stockQuantity: number;
    };
    quantity: number;
    pricing: {
      unitPrice: number;
      mrp: number;
      productPrice: number;
      discount: number;
      deliveryCharges: number;
      totalAmount: number;
    };
    variantId?: string;
  }>;
  pricing: {
    unitPrice: number;
    mrp: number;
    productPrice: number;
    discount: number;
    deliveryCharges: number;
    totalAmount: number;
  };
  prerequisites: {
    profileCompleted: boolean;
    addressCompleted: boolean;
    readyForCheckout: boolean;
  };
  address: {
    id: string;
    addressLine1: string;
    addressLine2: string;
    landmark: string | null;
    city: string;
    state: string;
    pincode: string;
    country: string;
    isDefault?: boolean;
  } | null;
  addresses?: Array<{
    id: string;
    addressLine1: string;
    addressLine2: string;
    landmark: string | null;
    city: string;
    state: string;
    pincode: string;
    country: string;
    isDefault: boolean;
  }>;
  purchaseOptions: Array<{ code: PurchaseType; label: string; description: string }>;
}

export interface CheckoutSession {
  id: string;
  userId: string;
  productId: string;
  items?: Array<{ productId: string; quantity: number }>;
  variantId?: string | null;
  quantity: number;
  purchaseType: PurchaseType;
  addressId: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCheckoutResponse {
  session: CheckoutSession;
  summary: Pick<CheckoutSummary, 'product' | 'quantity' | 'pricing' | 'items'>;
  redirectPath: string;
  nextStep: 'EMI_VERIFICATION' | 'DIRECT_PAYMENT';
}

export interface CheckoutSessionResponse {
  session: CheckoutSession;
  summary: Pick<CheckoutSummary, 'product' | 'quantity' | 'pricing' | 'items'>;
}

const SESSION_KEY = 'loanex.checkoutSessionId';

@Injectable({ providedIn: 'root' })
export class CheckoutApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/checkout`;

  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getSummary(productId: string, quantity = 1, variantId?: string, mode?: string): Observable<CheckoutSummary> {
    let params = new HttpParams().set('quantity', String(quantity));
    if (variantId) {
      params = params.set('variantId', variantId);
    }
    if (mode) {
      params = params.set('mode', mode);
    }
    return this.wrap(
      this.http.get<ApiSuccess<CheckoutSummary>>(`${this.baseUrl}/${productId || 'none'}`, { params }),
    );
  }

  create(payload: {
    productId?: string;
    mode?: string;
    variantId?: string;
    quantity: number;
    purchaseType: PurchaseType;
    addressId?: string;
  }): Observable<CreateCheckoutResponse> {
    return this.wrap(
      this.http.post<ApiSuccess<CreateCheckoutResponse>>(this.baseUrl, payload),
    ).pipe(
      tap((data) => this.saveSessionId(data.session.id)),
    );
  }

  getSession(sessionId: string): Observable<CheckoutSessionResponse> {
    return this.wrap(
      this.http.get<ApiSuccess<CheckoutSessionResponse>>(
        `${this.baseUrl}/session/${sessionId}`,
      ),
    );
  }

  saveSessionId(id: string): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, id);
    }
  }

  getSavedSessionId(): string | null {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem(SESSION_KEY);
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  private wrap<T>(source: Observable<ApiSuccess<T>>): Observable<T> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return source.pipe(
      map((res) => res.data),
      tap(() => this.loadingSignal.set(false)),
      catchError((err: unknown) => {
        this.loadingSignal.set(false);
        this.errorSignal.set(this.extractError(err));
        return throwError(() => err);
      }),
    );
  }

  private extractError(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const body = (err as { error?: { message?: string } }).error;
      if (body?.message) return body.message;
    }
    return 'Unable to complete checkout request.';
  }
}
