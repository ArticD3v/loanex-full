import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccess } from '../../../core/models/auth.models';

export interface PaymentHistoryFilters {
  status?: string;
  paymentType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface PaymentHistoryItem {
  id: string;
  emiId: string | null;
  emiNumber: number | null;
  dueDate: string | null;
  paidDate: string | null;
  amount: number;
  principal: number;
  interest: number;
  penalty: number;
  paymentMethod: string;
  transactionId: string | null;
  status: string;
  paymentType: string;
  receiptAvailable: boolean;
}

export interface PaymentHistoryResponse {
  summary: {
    loanAccountNumber: string;
    applicationNumber: string;
    totalLoanAmount: number;
    totalPaid: number;
    outstandingBalance: number;
    totalEmis: number;
    paidEmis: number;
    pendingEmis: number;
    overdueEmis: number;
  };
  items: PaymentHistoryItem[];
  total: number;
}

export interface LoanStatementResponse {
  loan: {
    id: string;
    loanAccountNumber: string;
    applicationNumber: string;
    productId: string;
    productName: string | null;
    productImage: string;
    loanAmount: number;
    interestRate: number;
    processingFee: number;
    loanTenure: number;
    emiAmount: number;
    loanStatus: string;
    loanStartDate: string;
    loanEndDate: string;
    nextEmiDueDate: string | null;
    lastPaymentDate: string | null;
  };
  interestSummary: {
    totalInterest: number;
    interestPaid: number;
    interestRemaining: number;
  };
  principalSummary: {
    totalPrincipal: number;
    principalPaid: number;
    principalRemaining: number;
  };
  outstandingAmount: number;
  totalPayable: number;
  totalPaid: number;
  loanCompletionPercent: number;
  emis: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
  };
  recentPayments: PaymentHistoryItem[];
}

@Injectable({ providedIn: 'root' })
export class EmiHistoryService {
  private readonly http = inject(HttpClient);
  private readonly historyUrl = `${environment.apiBaseUrl}/api/v1/emi/payment-history`;
  private readonly statementUrl = `${environment.apiBaseUrl}/api/v1/emi/statement`;

  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  getPaymentHistory(filters: PaymentHistoryFilters = {}): Observable<PaymentHistoryResponse> {
    return this.wrap(
      this.http.get<ApiSuccess<PaymentHistoryResponse>>(this.historyUrl, {
        params: this.toParams(filters),
      }),
    );
  }

  getPaymentById(paymentId: string): Observable<PaymentHistoryItem> {
    return this.wrap(
      this.http.get<ApiSuccess<PaymentHistoryItem>>(`${this.historyUrl}/${paymentId}`),
    );
  }

  getStatement(): Observable<LoanStatementResponse> {
    return this.wrap(this.http.get<ApiSuccess<LoanStatementResponse>>(this.statementUrl));
  }

  downloadStatementPdf(): Observable<Blob> {
    return this.downloadBlob(`${this.statementUrl}/pdf`);
  }

  downloadHistoryPdf(filters: PaymentHistoryFilters = {}): Observable<Blob> {
    return this.downloadBlob(`${this.historyUrl}/export`, {
      ...filters,
      format: 'pdf',
    });
  }

  downloadHistoryExcel(filters: PaymentHistoryFilters = {}): Observable<Blob> {
    return this.downloadBlob(`${this.historyUrl}/export`, {
      ...filters,
      format: 'excel',
    });
  }

  downloadReceipt(paymentId: string): Observable<Blob> {
    return this.downloadBlob(`${this.historyUrl}/${paymentId}/receipt`);
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  private downloadBlob(
    url: string,
    filters: PaymentHistoryFilters & { format?: string } = {},
  ): Observable<Blob> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http
      .get(url, {
        params: this.toParams(filters),
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((response) => {
          const blob = response.body;
          if (!blob || blob.size === 0) {
            throw new Error('Empty download response.');
          }
          const contentType = (response.headers.get('Content-Type') || blob.type || '').toLowerCase();
          // Guard against JSON/HTML error bodies mis-labeled as downloads.
          if (
            contentType.includes('application/json') ||
            contentType.includes('text/html') ||
            contentType.includes('text/plain')
          ) {
            throw new Error('Download failed: server did not return a file.');
          }
          return blob;
        }),
        tap(() => this.loadingSignal.set(false)),
        catchError((err: unknown) => {
          this.loadingSignal.set(false);
          const message = this.extractErrorSync(err);
          this.errorSignal.set(message);
          this.refineBlobError(err);
          return throwError(() => err);
        }),
      );
  }

  private toParams(filters: PaymentHistoryFilters & { format?: string }): HttpParams {
    let params = new HttpParams();
    const entries: Array<[string, string | undefined]> = [
      ['status', filters.status],
      ['paymentType', filters.paymentType],
      ['dateFrom', filters.dateFrom],
      ['dateTo', filters.dateTo],
      ['search', filters.search],
      ['format', filters.format],
    ];
    for (const [key, value] of entries) {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }

  private wrap<T>(source: Observable<ApiSuccess<T>>): Observable<T> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return source.pipe(
      map((res) => res.data),
      tap(() => this.loadingSignal.set(false)),
      catchError((err: unknown) => {
        this.loadingSignal.set(false);
        this.errorSignal.set(this.extractErrorSync(err));
        this.refineBlobError(err);
        return throwError(() => err);
      }),
    );
  }

  private refineBlobError(err: unknown): void {
    const httpErr = err as { error?: Blob | { message?: string } };
    if (!(httpErr?.error instanceof Blob)) return;
    void httpErr.error.text().then((text) => {
      try {
        const parsed = JSON.parse(text) as { message?: string };
        if (parsed?.message) this.errorSignal.set(parsed.message);
      } catch {
        // keep synchronous fallback
      }
    });
  }

  private extractErrorSync(err: unknown): string {
    const httpErr = err as {
      error?: Blob | { message?: string };
      message?: string;
      status?: number;
    };

    if (httpErr?.status === 401) return 'Please sign in again to view payment history.';
    if (httpErr?.status === 404) {
      if (httpErr?.error && !(httpErr.error instanceof Blob) && httpErr.error.message) {
        return httpErr.error.message;
      }
      return 'Payment history not found.';
    }
    if (httpErr?.error && !(httpErr.error instanceof Blob) && httpErr.error.message) {
      return httpErr.error.message;
    }
    return httpErr?.message || 'Unable to download file. Please try again.';
  }
}
