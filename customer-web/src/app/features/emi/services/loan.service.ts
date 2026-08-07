import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccess } from '../../../core/models/auth.models';

export interface LoanSummary {
  id: string;
  loanAccountNumber: string;
  applicationId: string;
  applicationNumber: string;
  productId: string;
  productName: string | null;
  productImage: string;
  productPrice: number;
  loanAmount: number;
  downPaymentPaid: number;
  processingFee: number;
  interestRate: number;
  loanTenure: number;
  emiAmount: number;
  totalInterest: number;
  totalPayable: number;
  outstandingAmount: number;
  loanStatus: string;
  loanStartDate: string;
  loanEndDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmiScheduleItem {
  id: string;
  emiNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  emiAmount: number;
  remainingBalance: number;
  paymentStatus: string;
  paidAt: string | null;
}

export interface LoanDashboard {
  loan: LoanSummary;
  summary: {
    outstandingBalance: number;
    totalLoanAmount: number;
    totalInterest: number;
    totalPayable: number;
    emisPaid: number;
    remainingEmis: number;
    nextEmiAmount: number | null;
    nextEmiDueDate: string | null;
    principalPaid: number;
    interestPaid: number;
    loanCompletionPercent: number;
  };
  nextEmi: {
    id: string;
    emiNumber: number;
    amount: number;
    dueDate: string;
    daysRemaining: number;
    status: string;
  } | null;
  recentPayments: Array<{
    emiId?: string;
    emiNumber: number;
    dueDate: string;
    paidDate: string | null;
    amount: number;
    status: string;
    receiptAvailable: boolean;
  }>;
  schedule: EmiScheduleItem[];
  canPayEmi: boolean;
}

export interface LoanPaymentHistory {
  loanAccountNumber: string;
  items: LoanDashboard['recentPayments'];
}

@Injectable({ providedIn: 'root' })
export class LoanService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/loans`;

  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getCurrent(): Observable<LoanSummary> {
    return this.wrap(this.http.get<ApiSuccess<LoanSummary>>(`${this.baseUrl}/current`));
  }

  getDashboard(): Observable<LoanDashboard> {
    return this.wrap(this.http.get<ApiSuccess<LoanDashboard>>(`${this.baseUrl}/dashboard`));
  }

  getPaymentHistory(): Observable<LoanPaymentHistory> {
    return this.wrap(
      this.http.get<ApiSuccess<LoanPaymentHistory>>(`${this.baseUrl}/payment-history`),
    );
  }

  downloadStatement(): Observable<Blob> {
    return this.downloadPdf('statement');
  }

  downloadAgreement(): Observable<Blob> {
    return this.downloadPdf('agreement');
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  private downloadPdf(type: 'statement' | 'agreement'): Observable<Blob> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.get(`${this.baseUrl}/${type}`, { responseType: 'blob' }).pipe(
      tap(() => this.loadingSignal.set(false)),
      catchError((err: unknown) => {
        this.loadingSignal.set(false);
        this.errorSignal.set(this.extractError(err));
        return throwError(() => err);
      }),
    );
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
    const httpErr = err as { error?: { message?: string }; message?: string; status?: number };
    if (httpErr?.status === 401) {
      return 'Please sign in again to view your EMI dashboard.';
    }
    if (httpErr?.status === 403) {
      return (
        httpErr?.error?.message ||
        'EMI dashboard is available only when your loan status is ACTIVE.'
      );
    }
    if (httpErr?.status === 404) {
      return httpErr?.error?.message || 'No active loan found for this account.';
    }
    return httpErr?.error?.message || httpErr?.message || 'Something went wrong. Please try again.';
  }
}
