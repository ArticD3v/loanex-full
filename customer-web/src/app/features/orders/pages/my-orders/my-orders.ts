import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { formatInr } from '../../../../shared/utils/currency';
import {
  OrderListItem,
  OrderListResponse,
  OrderService,
} from '../../../emi/services/order.service';

@Component({
  selector: 'app-my-orders',
  imports: [RouterLink],
  templateUrl: './my-orders.html',
  styleUrl: './my-orders.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyOrdersComponent implements OnInit {
  private readonly orderApi = inject(OrderService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly formatInr = formatInr;
  readonly loading = signal(true);
  readonly downloadingId = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  readonly orders = signal<OrderListResponse | null>(null);

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('paymentSuccess') === 'true') {
      this.info.set('🎉 Payment successful! Your order has been placed.');
    }
    this.load();
  }

  downloadInvoice(order: OrderListItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.downloadingId()) return;

    this.downloadingId.set(order.id);
    this.error.set(null);
    this.info.set(null);

    this.orderApi.downloadInvoice(order.id).subscribe({
      next: (blob) => {
        this.downloadingId.set(null);
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
        anchor.download = `${order.orderNumber}-invoice.pdf`;
        anchor.click();
        URL.revokeObjectURL(url);
        this.info.set('Invoice downloaded successfully.');
      },
      error: () => {
        this.downloadingId.set(null);
        this.error.set(this.orderApi.error() ?? 'Unable to download invoice.');
      },
    });
  }

  statusLabel(status: string): string {
    return status.replaceAll('_', ' ');
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private load(): void {
    if (!this.auth.isAuthenticated()) {
      this.loading.set(false);
      this.error.set('Please log in to view your orders.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.orderApi.list().subscribe({
      next: (data) => {
        this.loading.set(false);
        this.orders.set(data);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.orderApi.error() ?? 'Unable to load orders.');
      },
    });
  }
}
