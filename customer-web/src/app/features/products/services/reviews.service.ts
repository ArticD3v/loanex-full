import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccess } from '../../../core/models/auth.models';

export interface ReviewItem {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  review: string;
  createdAt: string;
  updatedAt: string;
  isOwn?: true;
}

export interface ProductReviewsResponse {
  productId: string;
  averageRating: number;
  totalReviews: number;
  items: ReviewItem[];
  myReview: ReviewItem | null;
}

export interface CreateReviewPayload {
  productId: string;
  rating: number;
  review: string;
}

export interface UpdateReviewPayload {
  rating?: number;
  review?: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/reviews`;

  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  create(payload: CreateReviewPayload): Observable<ReviewItem> {
    return this.wrap(this.http.post<ApiSuccess<ReviewItem>>(this.baseUrl, payload));
  }

  listByProduct(productId: string): Observable<ProductReviewsResponse> {
    if (!productId?.trim()) {
      this.errorSignal.set('Invalid product ID.');
      return throwError(() => new Error('Invalid product ID'));
    }

    return this.wrap(
      this.http.get<ApiSuccess<ProductReviewsResponse>>(`${this.baseUrl}/${productId}`),
    );
  }

  update(reviewId: string, payload: UpdateReviewPayload): Observable<ReviewItem> {
    return this.wrap(
      this.http.put<ApiSuccess<ReviewItem>>(`${this.baseUrl}/${reviewId}`, payload),
    );
  }

  delete(reviewId: string): Observable<{ deleted: boolean; reviewId: string }> {
    return this.wrap(
      this.http.delete<ApiSuccess<{ deleted: boolean; reviewId: string }>>(
        `${this.baseUrl}/${reviewId}`,
      ),
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
    return 'Unable to complete review request.';
  }
}
