import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccess } from '../../../core/models/auth.models';

export interface EmiPaymentDetails {
  emiId: string;
  loan: {
    id: string;
    loanAccountNumber: string;
    applicationNumber: string;
    productName: string | null;
    productImage: string;
    loanStatus: string;
  };
  emi: {
    emiNumber: number;
    dueDate: string;
    principalAmount: number;
    interestAmount: number;
    lateFee: number;
    gst: number;
    totalPayable: number;
    paymentStatus: string;
    paidAt: string | null;
    transactionId: string | null;
  };
  paymentSummary: {
    principal: number;
    interest: number;
    penalty: number;
    gst: number;
    grandTotal: number;
  };
  paymentMethod: {
    provider: string;
    label: string;
  };
  canPay: boolean;
  alreadyPaid: boolean;
  paymentDevBypass: boolean;
  receiptAvailable: boolean;
}

export interface CreateEmiPaymentOrderResponse {
  emiId: string;
  razorpayOrderId: string;
  keyId: string;
  amount: number;
  amountPaise: number;
  currency: string;
  paymentDevBypass: boolean;
  paymentSummary: EmiPaymentDetails['paymentSummary'];
  prefill: { name: string; email: string; contact: string };
  notes: Record<string, string>;
}

export interface VerifyEmiPaymentResponse {
  success: boolean;
  alreadyProcessed: boolean;
  emiId: string;
  emiNumber?: number;
  paymentId: string | null;
  paidAmount?: number;
  outstandingAmount?: number;
  remainingEmis?: number;
  nextEmiDueDate?: string | null;
  receiptAvailable?: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class EmiPaymentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/emi/payments`;

  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getByEmiId(emiId: string): Observable<EmiPaymentDetails> {
    return this.wrap(this.http.get<ApiSuccess<EmiPaymentDetails>>(`${this.baseUrl}/${emiId}`));
  }

  createOrder(emiId: string): Observable<CreateEmiPaymentOrderResponse> {
    return this.wrap(
      this.http.post<ApiSuccess<CreateEmiPaymentOrderResponse>>(`${this.baseUrl}/create-order`, {
        emiId,
      }),
    );
  }

  verify(payload: {
    emiId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Observable<VerifyEmiPaymentResponse> {
    return this.wrap(
      this.http.post<ApiSuccess<VerifyEmiPaymentResponse>>(`${this.baseUrl}/verify`, payload),
    );
  }

  createDevBypassSignature(razorpayOrderId: string): Observable<{
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    emiId: string | null;
  }> {
    return this.wrap(
      this.http.post<
        ApiSuccess<{
          razorpayOrderId: string;
          razorpayPaymentId: string;
          razorpaySignature: string;
          emiId: string | null;
        }>
      >(`${this.baseUrl}/dev-bypass-signature`, { razorpayOrderId }),
    );
  }

  downloadReceipt(emiId: string): Observable<Blob> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http
      .get(`${this.baseUrl}/${emiId}/receipt`, { responseType: 'blob', observe: 'response' })
      .pipe(
        map((response) => {
          const blob = response.body;
          if (!blob || blob.size === 0) {
            throw new Error('Empty download response.');
          }
          const contentType = (response.headers.get('Content-Type') || blob.type || '').toLowerCase();
          if (
            contentType.includes('application/json') ||
            contentType.includes('text/html') ||
            contentType.includes('text/plain')
          ) {
            throw new Error('Download failed: server did not return a PDF.');
          }
          return blob;
        }),
        tap(() => this.loadingSignal.set(false)),
        catchError((err: unknown) => {
          this.loadingSignal.set(false);
          this.errorSignal.set(this.extractError(err));
          return throwError(() => err);
        }),
      );
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
    const httpErr = err as { error?: { message?: string; code?: string }; message?: string; status?: number };
    if (httpErr?.status === 401) return 'Please sign in again to continue payment.';
    if (httpErr?.status === 409) {
      return httpErr?.error?.message || 'This EMI payment was already completed.';
    }
    if (httpErr?.status === 404) {
      return httpErr?.error?.message || 'EMI instalment not found.';
    }
    if (httpErr?.status === 400) {
      return httpErr?.error?.message || 'Payment verification failed. Please try again.';
    }
    if (httpErr?.status === 500 || httpErr?.status === 502 || httpErr?.status === 503) {
      return (
        httpErr?.error?.message ||
        'Payment verification failed. Please try again. If amount was deducted, contact support with your payment ID.'
      );
    }
    return httpErr?.error?.message || httpErr?.message || 'Payment verification failed. Please try again.';
  }
}
