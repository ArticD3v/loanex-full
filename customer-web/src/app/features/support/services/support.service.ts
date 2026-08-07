import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccess } from '../../../core/models/auth.models';

export type SupportIssueType =
  | 'ORDER_ISSUE'
  | 'EMI_ISSUE'
  | 'PAYMENT_ISSUE'
  | 'ACCOUNT_ISSUE'
  | 'OTHER';

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  issueType: SupportIssueType;
  subject: string;
  description: string;
  attachment: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketListResponse {
  items: SupportTicket[];
  totalItems: number;
}

export interface CreateSupportTicketPayload {
  issueType: SupportIssueType;
  subject: string;
  description: string;
  attachment?: string;
}

@Injectable({ providedIn: 'root' })
export class SupportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/support`;

  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  create(payload: CreateSupportTicketPayload): Observable<SupportTicket> {
    return this.wrap(this.http.post<ApiSuccess<SupportTicket>>(this.baseUrl, payload));
  }

  list(): Observable<SupportTicketListResponse> {
    return this.wrap(this.http.get<ApiSuccess<SupportTicketListResponse>>(this.baseUrl));
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
    return 'Unable to complete support request.';
  }
}
