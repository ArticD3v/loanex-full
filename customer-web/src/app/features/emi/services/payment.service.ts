import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccess } from '../../../core/models/auth.models';

export interface DownPaymentSummary {
  productPrice: number;
  loanAmount: number;
  downPayment: number;
  processingFee: number;
  gst: number;
  gstPercent: number;
  totalPayableToday: number;
  remainingFinancedAmount: number;
}

export interface DownPaymentContext {
  applicationId: string;
  applicationNumber: string;
  orderNumber: string | null;
  status: string;
  productId: string;
  productName: string | null;
  productImage: string;
  productPrice: number;
  approvedLoanAmount: number;
  approvedDownPayment: number;
  remainingFinancedAmount: number;
  paymentSummary: DownPaymentSummary;
  razorpayKeyId: string;
  paymentDevBypass: boolean;
  currency: string;
}

export interface CreatePaymentOrderResponse {
  applicationId: string;
  applicationNumber: string;
  transactionId: string;
  razorpayOrderId: string;
  amount: number;
  amountPaise: number;
  currency: string;
  keyId: string;
  paymentDevBypass: boolean;
  customer: { name: string; email: string; contact: string };
  prefill: { name: string; email: string; contact: string };
  notes: { applicationNumber: string; productName: string };
}

export interface VerifyPaymentResponse {
  paymentStatus: string;
  alreadyProcessed?: boolean;
  transactionId?: string;
  applicationId?: string;
  applicationNumber?: string;
  orderId?: string;
  orderNumber: string | null;
  orderStatus?: string;
  amount?: number;
  currency?: string;
  nextStep: string;
}

export interface OrderConfirmation {
  orderNumber: string;
  orderStatus: string;
  applicationNumber: string;
  productId: string;
  productName: string | null;
  productImage: string;
  productPrice: number;
  approvedLoanAmount: number;
  approvedDownPayment: number;
  amountPaidToday: number;
  createdAt: string;
}

export interface KycFeeStatus {
  paid: boolean;
  amount: number;
  purpose: 'KYC_VERIFICATION';
  paymentId: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  paidAt: string | null;
}

export interface CreateKycFeeOrderResponse {
  transactionId: string;
  razorpayOrderId: string;
  amount: number;
  amountPaise: number;
  currency: string;
  keyId: string;
  paymentDevBypass: boolean;
  purpose: 'KYC_VERIFICATION';
  customer: { name: string; email: string; contact: string };
  prefill: { name: string; email: string; contact: string };
  notes: { purpose: string };
}

export interface VerifyKycFeeResponse {
  paymentStatus: string;
  alreadyProcessed?: boolean;
  purpose: 'KYC_VERIFICATION';
  amount: number;
  transactionId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  paidAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/payments`;

  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getDownPaymentContext(): Observable<DownPaymentContext> {
    return this.wrap(
      this.http.get<ApiSuccess<DownPaymentContext>>(`${this.baseUrl}/down-payment`),
    );
  }

  createOrder(): Observable<CreatePaymentOrderResponse> {
    return this.wrap(
      this.http.post<ApiSuccess<CreatePaymentOrderResponse>>(`${this.baseUrl}/create-order`, {}),
    );
  }

  verify(payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Observable<VerifyPaymentResponse> {
    return this.wrap(
      this.http.post<ApiSuccess<VerifyPaymentResponse>>(`${this.baseUrl}/verify`, payload),
    );
  }

  getKycFeeStatus(): Observable<KycFeeStatus> {
    return this.wrap(
      this.http.get<ApiSuccess<KycFeeStatus>>(`${this.baseUrl}/kyc-fee/status`),
    );
  }

  createKycFeeOrder(): Observable<CreateKycFeeOrderResponse> {
    return this.wrap(
      this.http.post<ApiSuccess<CreateKycFeeOrderResponse>>(
        `${this.baseUrl}/kyc-fee/create-order`,
        {},
      ),
    );
  }

  verifyKycFee(payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Observable<VerifyKycFeeResponse> {
    return this.wrap(
      this.http.post<ApiSuccess<VerifyKycFeeResponse>>(
        `${this.baseUrl}/kyc-fee/verify`,
        payload,
      ),
    );
  }

  createDevBypassSignature(razorpayOrderId: string): Observable<{
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }> {
    return this.wrap(
      this.http.post<
        ApiSuccess<{
          razorpayOrderId: string;
          razorpayPaymentId: string;
          razorpaySignature: string;
        }>
      >(`${this.baseUrl}/dev-bypass-signature`, { razorpayOrderId }),
    );
  }

  getOrderConfirmation(orderNumber?: string): Observable<OrderConfirmation> {
    const url = orderNumber
      ? `${this.baseUrl}/order-confirmation?orderNumber=${encodeURIComponent(orderNumber)}`
      : `${this.baseUrl}/order-confirmation`;
    return this.wrap(this.http.get<ApiSuccess<OrderConfirmation>>(url));
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
    const httpErr = err as { error?: { message?: string }; message?: string };
    return httpErr?.error?.message || httpErr?.message || 'Something went wrong. Please try again.';
  }
}
