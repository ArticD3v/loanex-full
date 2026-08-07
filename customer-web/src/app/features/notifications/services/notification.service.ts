import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccess } from '../../../core/models/auth.models';

export type NotificationFilter =
  | 'ALL'
  | 'UNREAD'
  | 'LOAN'
  | 'ORDERS'
  | 'PAYMENTS'
  | 'OFFERS'
  | 'SYSTEM';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  description: string;
  type: string;
  category: string;
  priority: string;
  isRead: boolean;
  readStatus: 'READ' | 'UNREAD';
  readAt: string | null;
  metadata: Record<string, unknown> | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  unreadCount: number;
  total: number;
  items: AppNotification[];
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/notifications`;

  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly unreadCountSignal = signal(0);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly unreadCount = this.unreadCountSignal.asReadonly();

  list(filter: NotificationFilter = 'ALL'): Observable<NotificationListResponse> {
    let params = new HttpParams();
    if (filter !== 'ALL') {
      params = params.set('filter', filter);
    }
    return this.wrap(
      this.http.get<ApiSuccess<NotificationListResponse>>(this.baseUrl, { params }),
    ).pipe(
      tap((data) => this.unreadCountSignal.set(data.unreadCount)),
    );
  }

  getById(id: string): Observable<AppNotification> {
    return this.wrap(this.http.get<ApiSuccess<AppNotification>>(`${this.baseUrl}/${id}`));
  }

  markRead(id: string): Observable<AppNotification> {
    return this.wrap(
      this.http.patch<ApiSuccess<AppNotification>>(`${this.baseUrl}/${id}/read`, {}),
    );
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.wrap(
      this.http.patch<ApiSuccess<{ updated: number }>>(`${this.baseUrl}/read-all`, {}),
    );
  }

  delete(id: string): Observable<{ deleted: boolean }> {
    return this.wrap(
      this.http.delete<ApiSuccess<{ deleted: boolean }>>(`${this.baseUrl}/${id}`),
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
    if (err && typeof err === 'object' && 'error' in err) {
      const body = (err as { error?: { message?: string } }).error;
      if (body?.message) return body.message;
    }
    return 'Unable to complete notification request.';
  }
}
