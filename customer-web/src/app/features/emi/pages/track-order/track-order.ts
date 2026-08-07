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
import { formatInr } from '../../../../shared/utils/currency';
import { OrderService, OrderTrackingDetails } from '../../services/order.service';

@Component({
  selector: 'app-order-tracking',
  imports: [RouterLink],
  templateUrl: './track-order.html',
  styleUrl: './track-order.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderTrackingComponent implements OnInit, OnDestroy {
  private readonly orderApi = inject(OrderService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly downloading = signal(false);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  readonly tracking = signal<OrderTrackingDetails | null>(null);

  private orderId = '';
  private pollId: ReturnType<typeof setInterval> | null = null;

  readonly isDelivered = computed(() => this.tracking()?.orderStatus === 'DELIVERED');
  readonly canOpenEmiDashboard = computed(
    () => Boolean(this.tracking()?.canOpenEmiDashboard || this.isDelivered()),
  );

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('orderId') ?? '';
    if (!this.orderId.trim()) {
      this.loading.set(false);
      this.error.set('Invalid order ID.');
      return;
    }

    this.load(true);
    this.pollId = setInterval(() => this.load(false), 60_000);
  }

  ngOnDestroy(): void {
    if (this.pollId) {
      clearInterval(this.pollId);
      this.pollId = null;
    }
  }

  refreshStatus(): void {
    this.load(false);
  }

  contactSupport(): void {
    const current = this.tracking();
    const subject = encodeURIComponent(
      `Support request for order ${current?.orderNumber ?? this.orderId}`,
    );
    const body = encodeURIComponent(
      `Hello LoanEx Support,\n\nI need help with order ${current?.orderNumber ?? this.orderId}.\nApplication: ${current?.applicationNumber ?? '—'}\nStatus: ${current?.orderStatus ?? '—'}\n`,
    );
    window.location.href = `mailto:support@loanex.in?subject=${subject}&body=${body}`;
  }

  downloadInvoice(): void {
    const current = this.tracking();
    if (!current?.id || this.downloading()) return;

    this.downloading.set(true);
    this.error.set(null);
    this.info.set(null);

    this.orderApi.downloadInvoice(current.id).subscribe({
      next: (blob) => {
        this.downloading.set(false);
        if (blob.type?.includes('application/json')) {
          void blob.text().then((text) => {
            try {
              const parsed = JSON.parse(text) as { message?: string };
              this.error.set(parsed.message ?? 'Unable to download invoice.');
            } catch {
              this.error.set('Unable to download invoice.');
            }
          });
          return;
        }

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${current.orderNumber}-invoice.pdf`;
        anchor.click();
        URL.revokeObjectURL(url);
        this.info.set('Invoice downloaded successfully.');
      },
      error: () => {
        this.downloading.set(false);
        this.error.set(this.orderApi.error() ?? 'Unable to download invoice.');
      },
    });
  }

  goBack(): void {
    const current = this.tracking();
    void this.router.navigate(['/order/confirmation'], {
      queryParams: current ? { orderId: current.id } : undefined,
    });
  }

  goToEmiDashboard(): void {
    if (!this.canOpenEmiDashboard()) {
      this.info.set(
        'Your EMI dashboard will be available once your order is marked as Delivered.',
      );
      return;
    }
    void this.router.navigateByUrl('/my-emi');
  }

  formatMoney(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return formatInr(value);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDeliveryDate(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private load(showFullLoading: boolean): void {
    if (showFullLoading) {
      this.loading.set(true);
    } else {
      this.refreshing.set(true);
    }

    this.orderApi.getTracking(this.orderId).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set(null);
        this.tracking.set(data);
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
        this.error.set(this.orderApi.error() ?? 'Order not found or you do not have access.');
      },
    });
  }
}

/** @deprecated Prefer OrderTrackingComponent */
export { OrderTrackingComponent as TrackOrderComponent };
