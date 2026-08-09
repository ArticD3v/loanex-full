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
import { forkJoin, of, catchError } from 'rxjs';
import { formatInr } from '../../../../shared/utils/currency';
import { paymentTypeLabel } from '../../../../shared/utils/payment-labels';
import { LayoutUiService } from '../../../../layout/services/layout-ui.service';
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
  private readonly layoutUi = inject(LayoutUiService);

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

  /**
   * Upcoming (unpaid) installments from the live loan schedule — the mirror
   * of the paid history above, showing due dates and amounts still to pay.
   */
  readonly upcomingInstallments = computed(() => {
    const order = this.order();
    if (!order?.emiSchedule) return [];
    return order.emiSchedule.filter(
      (row) => row.paymentStatus !== 'PAID',
    );
  });

  /**
   * Live payment history, mirroring the invoice's Payment History table:
   * the collected down payment first, then each paid EMI (only collected rows).
   */
  readonly paymentHistory = computed(() => {
    const order = this.order();
    if (!order) return [];
    const rows: { label: string; date: string | null; amount: number }[] = [];
    if (order.downPaymentCollected && order.downPaymentCollected > 0) {
      rows.push({
        label: 'Down Payment',
        date: order.transactionDate ?? null,
        amount: order.downPaymentCollected,
      });
    }
    for (const payment of order.emiPayments ?? []) {
      rows.push({
        label: `EMI #${payment.emiNumber}`,
        date: payment.paidAt ?? payment.dueDate ?? null,
        amount: payment.amount,
      });
    }
    // COD cash is collected at delivery — show it in the history once paid.
    if (
      order.paymentType === 'COD' &&
      order.amountPaid > 0 &&
      (order.paymentStatus === 'SUCCESS' || order.paymentStatus === 'PAID')
    ) {
      rows.push({
        label: 'Paid at Delivery',
        date: order.paidAtDelivery ?? order.transactionDate ?? null,
        amount: order.amountPaid,
      });
    }
    return rows;
  });

  private orderRef = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const nextRef = params.get('orderId') ?? '';
      if (!nextRef.trim()) {
        this.loading.set(false);
        this.error.set('Invalid order reference.');
        this.order.set(null);
        return;
      }
      if (nextRef === this.orderRef && this.order()) {
        return;
      }
      this.orderRef = nextRef;
      this.load();
    });
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

  formatPaymentType(value: string | null | undefined): string {
    return paymentTypeLabel(value);
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
      order: this.orderApi.getById(this.orderRef),
      tracking: this.orderApi.getTracking(this.orderRef).pipe(
        catchError(() =>
          of({
            steps: [],
            trackingEvents: [],
          } as Partial<OrderTrackingDetails> as OrderTrackingDetails),
        ),
      ),
    }).subscribe({
      next: ({ order, tracking }) => {
        this.loading.set(false);
        this.order.set(order);
        this.setBreadcrumbs(order);

        const steps =
          tracking.steps?.length
            ? tracking.steps
            : ((tracking as { trackingSteps?: OrderTrackingDetails['steps'] }).trackingSteps ?? []);
        this.tracking.set({
          ...order,
          ...tracking,
          steps,
        });

        // Prefer human-readable URL, but never leave the page stuck loading.
        const publicRef = order.orderNumber || order.id;
        if (
          publicRef &&
          publicRef !== this.orderRef &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            this.orderRef,
          )
        ) {
          this.orderRef = publicRef;
          void this.router.navigate(['/orders', publicRef], {
            replaceUrl: true,
            queryParamsHandling: 'preserve',
          });
        }

        const autopay = this.route.snapshot.queryParamMap.get('autopay');
        if (autopay === '1' && order.downPaymentPaid) {
          this.showAutopayDialog.set(true);
        }
      },
      error: () => {
        this.loading.set(false);
        this.order.set(null);
        this.error.set(this.orderApi.error() ?? 'Order not found or you do not have access.');
      },
    });
  }

  private setBreadcrumbs(order: OrderConfirmationDetails): void {
    this.layoutUi.setBreadcrumbs([
      { label: 'Home', path: '/' },
      { label: 'Orders', path: '/my-orders' },
      { label: order.orderNumber || 'Order Details' },
    ]);
  }

  private reloadOrder(): void {
    this.orderApi.getById(this.orderRef).subscribe({
      next: (order) => {
        this.order.set(order);
        this.setBreadcrumbs(order);
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
        if (result.orderNumber || result.orderId) {
          const nextRef = result.orderNumber || result.orderId!;
          if (nextRef !== this.orderRef) {
            void this.router.navigate(['/orders', nextRef], {
              queryParams: { autopay: 1 },
              replaceUrl: true,
            });
            return;
          }
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
