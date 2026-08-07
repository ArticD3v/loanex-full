import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Dialog } from 'primeng/dialog';
import { forkJoin } from 'rxjs';
import { formatInr } from '../../../../shared/utils/currency';
import { AutopayService } from '../../../emi/services/autopay.service';
import {
  CreatePaymentOrderResponse,
  PaymentService,
} from '../../../emi/services/payment.service';
import {
  OrderConfirmationDetails,
  OrderService,
  OrderTrackingDetails,
} from '../../../emi/services/order.service';
import { openRazorpayCheckout } from '../../../emi/utils/razorpay-checkout';

@Component({
  selector: 'app-order-details',
  imports: [RouterLink, Dialog],
  templateUrl: './order-details.html',
  styleUrl: './order-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailsComponent implements OnInit {
  private readonly orderApi = inject(OrderService);
  private readonly paymentApi = inject(PaymentService);
  private readonly autopayApi = inject(AutopayService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly downloading = signal(false);
  readonly paying = signal(false);
  readonly showAutopayDialog = signal(false);
  readonly autopaySubmitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  readonly order = signal<OrderConfirmationDetails | null>(null);
  readonly tracking = signal<OrderTrackingDetails | null>(null);

  readonly payLabel = computed(() => {
    const emi = this.order()?.emi;
    if (emi?.downPayment !== undefined && emi?.downPayment !== null) {
      return `Pay Down Payment (${formatInr(emi.downPayment)})`;
    }
    return 'Pay Down Payment';
  });

  readonly hasInterestRate = computed(() => {
    const rate = this.order()?.emi?.interestRate;
    return rate !== null && rate !== undefined;
  });

  readonly hasProcessingFee = computed(() => {
    const fee = this.order()?.emi?.processingFee;
    return fee !== null && fee !== undefined && fee > 0;
  });

  private orderId = '';

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('orderId') ?? '';
    if (!this.orderId.trim()) {
      this.loading.set(false);
      this.error.set('Invalid order ID.');
      return;
    }

    this.load();
  }

  downloadInvoice(): void {
    const current = this.order();
    if (!current?.id || this.downloading() || !current.invoiceAvailable) return;

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

  payDownPayment(): void {
    if (this.paying() || !this.order()?.canPayDownPayment) return;
    this.paying.set(true);
    this.error.set(null);

    this.paymentApi.createOrder().subscribe({
      next: (paymentOrder) => {
        if (paymentOrder.paymentDevBypass) {
          this.completeWithDevBypass(paymentOrder);
          return;
        }
        void this.openCheckout(paymentOrder);
      },
      error: () => {
        this.paying.set(false);
        this.error.set(this.paymentApi.error() ?? 'Unable to start payment.');
      },
    });
  }

  enableAutopay(): void {
    if (this.autopaySubmitting()) return;
    this.autopaySubmitting.set(true);
    this.error.set(null);

    this.autopayApi
      .createMandate({
        paymentMethod: 'UPI_AUTOPAY',
      })
      .subscribe({
        next: (result) => {
          this.autopaySubmitting.set(false);
          this.showAutopayDialog.set(false);
          this.info.set(result.message ?? 'AutoPay enabled successfully.');
        },
        error: () => {
          this.autopaySubmitting.set(false);
          this.error.set(this.autopayApi.error() ?? 'Unable to enable AutoPay.');
        },
      });
  }

  dismissAutopay(): void {
    if (this.autopaySubmitting()) return;
    this.showAutopayDialog.set(false);
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

  formatRate(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return `${value}% p.a.`;
  }

  statusLabel(status: string): string {
    return status.replaceAll('_', ' ');
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      order: this.orderApi.getById(this.orderId),
      tracking: this.orderApi.getTracking(this.orderId),
    }).subscribe({
      next: ({ order, tracking }) => {
        this.loading.set(false);
        this.order.set(order);
        this.tracking.set(tracking);

        const autopay = this.route.snapshot.queryParamMap.get('autopay');
        if (autopay === '1' && order.downPaymentPaid) {
          this.showAutopayDialog.set(true);
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.orderApi.error() ?? 'Order not found or you do not have access.');
      },
    });
  }

  private reloadOrder(): void {
    this.orderApi.getById(this.orderId).subscribe({
      next: (order) => {
        this.order.set(order);
        if (order.downPaymentPaid) {
          this.showAutopayDialog.set(true);
        }
      },
      error: () => {
        this.error.set(this.orderApi.error() ?? 'Unable to refresh order details.');
      },
    });
  }

  private completeWithDevBypass(order: CreatePaymentOrderResponse): void {
    this.paymentApi.createDevBypassSignature(order.razorpayOrderId).subscribe({
      next: (signed) => this.verifyPayment(signed),
      error: () => {
        this.paying.set(false);
        this.error.set(this.paymentApi.error() ?? 'Dev payment bypass failed.');
      },
    });
  }

  private async openCheckout(order: CreatePaymentOrderResponse): Promise<void> {
    try {
      await openRazorpayCheckout({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        name: 'LoanEx',
        description: `Down payment for ${order.applicationNumber}`,
        order_id: order.razorpayOrderId,
        prefill: order.prefill,
        notes: order.notes,
        theme: { color: '#0A2E6F' },
        handler: (response) => {
          this.verifyPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: () => {
            this.paying.set(false);
            this.error.set('Payment was cancelled. You can try again when ready.');
          },
        },
      });
    } catch {
      this.paying.set(false);
      this.error.set('Unable to open Razorpay checkout. Please try again.');
    }
  }

  private verifyPayment(payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): void {
    this.paymentApi.verify(payload).subscribe({
      next: (result) => {
        this.paying.set(false);
        this.info.set('Down payment completed successfully.');
        if (result.orderId && result.orderId !== this.orderId) {
          void this.router.navigate(['/orders', result.orderId], {
            queryParams: { autopay: 1 },
            replaceUrl: true,
          });
          return;
        }
        this.reloadOrder();
        this.showAutopayDialog.set(true);
      },
      error: () => {
        this.paying.set(false);
        this.error.set(this.paymentApi.error() ?? 'Payment verification failed.');
      },
    });
  }
}
