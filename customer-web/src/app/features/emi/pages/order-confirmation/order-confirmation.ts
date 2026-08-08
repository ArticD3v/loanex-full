import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { formatInr } from '../../../../shared/utils/currency';
import { OrderConfirmationDetails, OrderService } from '../../services/order.service';

@Component({
  selector: 'app-order-confirmation',
  imports: [RouterLink],
  templateUrl: './order-confirmation.html',
  styleUrl: './order-confirmation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderConfirmationComponent implements OnInit {
  private readonly orderApi = inject(OrderService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly downloading = signal(false);
  readonly navigating = signal(false);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  readonly order = signal<OrderConfirmationDetails | null>(null);

  /** Post-payment banner shown after the EMI down-payment redirect lands here. */
  readonly banner = signal<{
    title: string;
    message: string;
    paymentId: string | null;
    alreadyProcessed: boolean;
  } | null>(null);

  ngOnInit(): void {
    this.readPaymentBanner();

    const orderId = this.route.snapshot.queryParamMap.get('orderId') ?? undefined;

    if (orderId === '') {
      this.loading.set(false);
      this.error.set('Invalid order ID.');
      return;
    }

    const source = orderId ? this.orderApi.getById(orderId) : this.orderApi.getCurrent();

    source.subscribe({
      next: (data) => {
        this.loading.set(false);
        this.order.set(data);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.orderApi.error() ?? 'Unable to load order confirmation.');
      },
    });
  }

  /** Link the success banner to the order once it has loaded. */
  viewOrderId(): string | null {
    return this.order()?.id ?? null;
  }

  dismissBanner(): void {
    this.banner.set(null);
    // Strip the post-payment params so a page refresh doesn't re-show the
    // banner (the confirmation content below still shows the order).
    void this.router.navigate([], {
      queryParams: { paymentSuccess: null, paymentId: null, alreadyProcessed: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private readPaymentBanner(): void {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('paymentSuccess') !== 'true') return;

    const paymentId = params.get('paymentId');
    const alreadyProcessed = params.get('alreadyProcessed') === 'true';

    this.banner.set({
      title: alreadyProcessed ? 'Down payment already received' : 'Down payment successful!',
      message: alreadyProcessed
        ? 'This payment was already processed — your order is confirmed. No need to pay again.'
        : 'Your down payment was received and your order is confirmed.',
      paymentId: paymentId?.trim() ? paymentId : null,
      alreadyProcessed,
    });
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

  trackOrder(): void {
    const current = this.order();
    if (!current?.id) {
      this.error.set('Order ID is missing. Unable to track this order.');
      return;
    }

    this.info.set(null);
    this.error.set(null);
    void this.router.navigate(['/orders', current.id]);
  }

  viewEmiSchedule(): void {
    if (this.navigating()) return;
    this.navigating.set(true);
    this.info.set(null);
    this.error.set(null);
    void this.router.navigateByUrl('/my-emi').finally(() => this.navigating.set(false));
  }

  downloadReceipt(): void {
    const current = this.order();
    if (!current?.id || this.downloading()) return;

    this.downloading.set(true);
    this.error.set(null);
    this.info.set(null);

    this.orderApi.downloadReceipt(current.id).subscribe({
      next: (blob) => {
        this.downloading.set(false);

        if (blob.type && blob.type.includes('application/json')) {
          void blob.text().then((text) => {
            try {
              const parsed = JSON.parse(text) as { message?: string };
              this.error.set(parsed.message ?? 'Unable to download receipt.');
            } catch {
              this.error.set('Unable to download receipt.');
            }
          });
          return;
        }

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${current.orderNumber}-receipt.pdf`;
        anchor.click();
        URL.revokeObjectURL(url);
        this.info.set('Receipt downloaded successfully.');
      },
      error: () => {
        this.downloading.set(false);
        this.error.set(this.orderApi.error() ?? 'Unable to download receipt.');
      },
    });
  }

  goHome(): void {
    void this.router.navigateByUrl('/');
  }
}
