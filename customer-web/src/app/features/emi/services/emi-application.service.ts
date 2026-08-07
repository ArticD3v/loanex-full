import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccess } from '../../../core/models/auth.models';

export interface EmiReviewContext {
  personal: {
    fullName: string;
    mobile: string;
    email: string;
  };
  aadhaar: {
    aadhaarNumberMasked: string | null;
    status: string;
    verified: boolean;
  };
  pan: {
    panNumberMasked: string | null;
    status: string;
    verified: boolean;
  };
  bank: {
    accountHolderName: string | null;
    bankName: string | null;
    accountNumberMasked: string | null;
    ifscCode: string | null;
    status: string;
    verified: boolean;
  };
  verification: {
    mobileVerified: boolean;
    aadhaarVerified: boolean;
    panVerified: boolean;
    bankVerified: boolean;
    overallStatus: string;
    canSubmit: boolean;
  };
  activeApplication: EmiApplication | null;
}

export interface EmiApplication {
  id: string;
  applicationNumber: string;
  userId: string;
  productId: string;
  productName: string | null;
  sellingPrice: number | null;
  requestedAmount: number | null;
  requestedDownPayment: number | null;
  requestedTenure: number;
  estimatedMonthlyEmi: number | null;
  approvedAmount: number | null;
  approvedTenure: number | null;
  approvedDownPayment: number | null;
  monthlyEmi: number | null;
  interestRate: number | null;
  processingFee: number | null;
  status: string;
  adminRemarks: string | null;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  offerAcceptedAt: string | null;
  offerDeclinedAt: string | null;
  termsModifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  nextStep?: string;
  message?: string;
  orderId?: string | null;
  orderNumber?: string | null;
}

export interface EmiApplicationCurrentResponse {
  applicationNumber: string;
  status: string;
  submittedAt: string;
  approvedAmount: number | null;
  approvedTenure: number | null;
  approvedDownPayment: number | null;
  rejectionReason: string | null;
  adminRemarks: string | null;
  canModifyApplication: boolean;
  canSubmitAnother: boolean;
  canPayDownPayment: boolean;
  canAcceptOffer: boolean;
  timeline: {
    mobileVerified: boolean;
    aadhaarVerified: boolean;
    panVerified: boolean;
    bankVerified: boolean;
    applicationSubmitted: boolean;
    waitingForAdminReview: boolean;
    underReview: boolean;
    approved: boolean;
    rejected: boolean;
  };
  application: EmiApplication;
}

export interface EmiApplicationStatusResponse extends Partial<EmiApplicationCurrentResponse> {
  hasApplication: boolean;
  canProceedToDownPayment?: boolean;
}

export interface ApprovedLoanOffer {
  applicationNumber: string;
  applicationDate: string;
  submittedAt: string;
  status: string;
  productName: string | null;
  productPrice: number | null;
  sellingPrice: number | null;
  approvedLoanAmount: number | null;
  approvedAmount: number | null;
  approvedDownPayment: number | null;
  approvedTenure: number | null;
  monthlyEmi: number | null;
  interestRate: number | null;
  processingFee: number | null;
  adminRemarks: string | null;
  canAcceptOffer: boolean;
  canDeclineOffer: boolean;
  nextStep?: string;
}

export interface EmiApplicationHistoryItem extends EmiApplication {
  orderId?: string | null;
  orderNumber?: string | null;
  loanAccountNumber?: string | null;
  loanId?: string | null;
  loanStatus?: string | null;
  nextStep?: string;
}

export interface EmiApplicationHistoryResponse {
  items: EmiApplicationHistoryItem[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class EmiApplicationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/emi/applications`;

  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getReview(): Observable<EmiReviewContext> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.get<ApiSuccess<EmiReviewContext>>(`${this.baseUrl}/review`).pipe(
      map((res) => res.data),
      tap(() => this.loadingSignal.set(false)),
      catchError((err: unknown) => {
        this.loadingSignal.set(false);
        this.errorSignal.set(this.extractError(err));
        return throwError(() => err);
      }),
    );
  }

  submit(payload: {
    productId: string;
    productName?: string;
    sellingPrice: number;
    requestedAmount: number;
    requestedDownPayment: number;
    requestedTenure: number;
    estimatedMonthlyEmi: number;
  }): Observable<EmiApplication> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<ApiSuccess<EmiApplication>>(this.baseUrl, payload).pipe(
      map((res) => res.data),
      tap(() => this.loadingSignal.set(false)),
      catchError((err: unknown) => {
        this.loadingSignal.set(false);
        this.errorSignal.set(this.extractError(err));
        return throwError(() => err);
      }),
    );
  }

  getCurrent(event: 'viewed' | 'refreshed' = 'viewed'): Observable<EmiApplicationCurrentResponse> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const params = new HttpParams().set('event', event);

    return this.http
      .get<ApiSuccess<EmiApplicationCurrentResponse>>(`${this.baseUrl}/current`, { params })
      .pipe(
        map((res) => res.data),
        tap(() => this.loadingSignal.set(false)),
        catchError((err: unknown) => {
          this.loadingSignal.set(false);
          this.errorSignal.set(this.extractError(err));
          return throwError(() => err);
        }),
      );
  }

  getStatus(event?: 'viewed' | 'refreshed'): Observable<EmiApplicationStatusResponse> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    let params = new HttpParams();
    if (event) {
      params = params.set('event', event);
    }

    return this.http
      .get<ApiSuccess<EmiApplicationStatusResponse>>(`${this.baseUrl}/status`, { params })
      .pipe(
        map((res) => res.data),
        tap(() => this.loadingSignal.set(false)),
        catchError((err: unknown) => {
          this.loadingSignal.set(false);
          this.errorSignal.set(this.extractError(err));
          return throwError(() => err);
        }),
      );
  }

  getCurrentOffer(): Observable<ApprovedLoanOffer> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http
      .get<ApiSuccess<ApprovedLoanOffer>>(`${this.baseUrl}/current-offer`)
      .pipe(
        map((res) => res.data),
        tap(() => this.loadingSignal.set(false)),
        catchError((err: unknown) => {
          this.loadingSignal.set(false);
          this.errorSignal.set(this.extractError(err));
          return throwError(() => err);
        }),
      );
  }

  getHistory(): Observable<EmiApplicationHistoryResponse> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http
      .get<ApiSuccess<EmiApplicationHistoryResponse>>(`${this.baseUrl}/history`)
      .pipe(
        map((res) => res.data),
        tap(() => this.loadingSignal.set(false)),
        catchError((err: unknown) => {
          this.loadingSignal.set(false);
          this.errorSignal.set(this.extractError(err));
          return throwError(() => err);
        }),
      );
  }

  acceptOffer(): Observable<EmiApplication> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<ApiSuccess<EmiApplication>>(`${this.baseUrl}/accept-offer`, {}).pipe(
      map((res) => res.data),
      tap(() => this.loadingSignal.set(false)),
      catchError((err: unknown) => {
        this.loadingSignal.set(false);
        this.errorSignal.set(this.extractError(err));
        return throwError(() => err);
      }),
    );
  }

  declineOffer(): Observable<EmiApplication> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<ApiSuccess<EmiApplication>>(`${this.baseUrl}/decline-offer`, {}).pipe(
      map((res) => res.data),
      tap(() => this.loadingSignal.set(false)),
      catchError((err: unknown) => {
        this.loadingSignal.set(false);
        this.errorSignal.set(this.extractError(err));
        return throwError(() => err);
      }),
    );
  }

  /** Dev/test only — simulates Admin approval from the pending page. */
  devApprove(): Observable<EmiApplication> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<ApiSuccess<EmiApplication>>(`${this.baseUrl}/dev-approve`, {}).pipe(
      map((res) => res.data),
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

  private extractError(err: unknown): string {
    const httpErr = err as { error?: { message?: string }; message?: string };
    return httpErr?.error?.message || httpErr?.message || 'Something went wrong. Please try again.';
  }
}
