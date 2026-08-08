import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal<string | null>(null);
  readonly current = signal<EmiApplicationCurrentResponse | null>(null);

  private pollId: ReturnType<typeof setInterval> | null = null;
  private initialLoadDone = false;
  private applicationId: string | undefined;

  readonly statusBadge = computed(() => this.current()?.status ?? 'PENDING');
  readonly isUnderReview = computed(() => this.current()?.status === 'UNDER_REVIEW');

  ngOnInit(): void {
    this.applicationId =
      this.route.snapshot.queryParamMap.get('applicationId') ?? undefined;
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

  private appQuery(): Record<string, string> | undefined {
    const id = this.applicationId || this.current()?.application?.id;
    return id ? { applicationId: id } : undefined;
  }

  private load(event: 'viewed' | 'refreshed', showFullLoading: boolean): void {
    if (showFullLoading && !this.initialLoadDone) {
      this.loading.set(true);
    } else {
      this.refreshing.set(true);
    }

    const request$ = this.applicationId
      ? this.emiApi.getById(this.applicationId, event)
      : this.emiApi.getCurrent(event);

    request$.subscribe({
      next: (data) => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.initialLoadDone = true;
        this.error.set(null);
        this.current.set(data);
        this.applicationId = data.application?.id ?? this.applicationId;
        this.handleStatusNavigation(data.status, data);
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set(this.emiApi.error() ?? 'Unable to load application status.');
      },
    });
  }

  private handleStatusNavigation(
    status: string,
    data: EmiApplicationCurrentResponse,
  ): void {
    if (status === 'PENDING' || status === 'UNDER_REVIEW') {
      return;
    }

    if (this.pollId) {
      clearInterval(this.pollId);
      this.pollId = null;
    }

    const q = this.appQuery();
    const orderNumber = data.application?.orderNumber ?? undefined;
    const orderId = data.application?.orderId ?? undefined;

    switch (status) {
      case 'APPROVED':
        void this.router.navigate(['/application/approved'], { queryParams: q });
        break;
      case 'OFFER_ACCEPTED':
      case 'DOWN_PAYMENT_PENDING':
        void this.router.navigate(['/application/down-payment'], { queryParams: q });
        break;
      case 'DOWN_PAYMENT_COMPLETED':
      case 'ORDER_CONFIRMED':
        if (orderNumber || orderId) {
          void this.router.navigate(['/order/confirmation'], {
            queryParams: {
              ...(orderNumber ? { orderNumber } : {}),
              ...(orderId ? { orderId } : {}),
              ...q,
            },
          });
        } else {
          void this.router.navigateByUrl('/my-orders');
        }
        break;
      case 'ACTIVE_EMI':
        void this.router.navigate(['/my-emi'], { queryParams: q });
        break;
      case 'REJECTED':
        void this.router.navigate(['/application/rejected'], { queryParams: q });
        break;
      case 'DECLINED_BY_CUSTOMER':
        void this.router.navigateByUrl('/my-emis');
        break;
    }
  }
}
