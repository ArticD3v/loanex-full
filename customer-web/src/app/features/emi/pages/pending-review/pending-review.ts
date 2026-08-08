import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  EmiApplicationCurrentResponse,
  EmiApplicationService,
} from '../../services/emi-application.service';

@Component({
  selector: 'app-pending-review',
  imports: [RouterLink],
  templateUrl: './pending-review.html',
  styleUrl: './pending-review.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingReviewComponent implements OnInit, OnDestroy {
  private readonly emiApi = inject(EmiApplicationService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal<string | null>(null);
  readonly current = signal<EmiApplicationCurrentResponse | null>(null);

  private pollId: ReturnType<typeof setInterval> | null = null;
  private initialLoadDone = false;

  readonly statusBadge = computed(() => this.current()?.status ?? 'PENDING');
  readonly isUnderReview = computed(() => this.current()?.status === 'UNDER_REVIEW');

  ngOnInit(): void {
    this.load('viewed', true);
    this.pollId = setInterval(() => this.load('refreshed', false), 30_000);
  }

  ngOnDestroy(): void {
    if (this.pollId) {
      clearInterval(this.pollId);
      this.pollId = null;
    }
  }

  refresh(): void {
    this.load('refreshed', false);
  }

  formatDate(value: string | undefined | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private load(event: 'viewed' | 'refreshed', showFullLoading: boolean): void {
    if (showFullLoading && !this.initialLoadDone) {
      this.loading.set(true);
    } else {
      this.refreshing.set(true);
    }

    this.emiApi.getCurrent(event).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.initialLoadDone = true;
        this.error.set(null);
        this.current.set(data);
        this.handleStatusNavigation(data.status);
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set(this.emiApi.error() ?? 'Unable to load application status.');
      },
    });
  }

  private handleStatusNavigation(status: string): void {
    if (status === 'PENDING' || status === 'UNDER_REVIEW') {
      return;
    }

    if (this.pollId) {
      clearInterval(this.pollId);
      this.pollId = null;
    }

    switch (status) {
      case 'APPROVED':
        void this.router.navigateByUrl('/application/approved');
        break;
      case 'OFFER_ACCEPTED':
      case 'DOWN_PAYMENT_PENDING':
        void this.router.navigateByUrl('/application/down-payment');
        break;
      case 'DOWN_PAYMENT_COMPLETED':
      case 'ORDER_CONFIRMED':
        void this.router.navigateByUrl('/order/confirmation');
        break;
      case 'ACTIVE_EMI':
        void this.router.navigateByUrl('/my-emi');
        break;
      case 'REJECTED':
        void this.router.navigateByUrl('/application/rejected');
        break;
      case 'DECLINED_BY_CUSTOMER':
        void this.router.navigateByUrl('/');
        break;
    }
  }
}
