import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { formatInr } from '../../../../shared/utils/currency';
import {
  CreateEmiPaymentOrderResponse,
  EmiPaymentDetails,
  EmiPaymentService,
} from '../../services/emi-payment.service';
import { openRazorpayCheckout } from '../../utils/razorpay-checkout';

@Component({
  selector: 'app-emi-payment',
  imports: [RouterLink],
  templateUrl: './emi-payment.html',
  styleUrl: './emi-payment.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmiPaymentComponent implements OnInit {
  private readonly paymentApi = inject(EmiPaymentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly paying = signal(false);
  readonly downloading = signal(false);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  readonly details = signal<EmiPaymentDetails | null>(null);

  private emiId = '';

  readonly payLabel = computed(() => {
    const total = this.details()?.paymentSummary.grandTotal;
    if (total === undefined) return 'Pay Now';
    return `Pay Now · ${formatInr(total)}`;
  });

  ngOnInit(): void {
    this.emiId = this.route.snapshot.paramMap.get('emiId') ?? '';
    if (!this.emiId.trim()) {
      this.loading.set(false);
      this.error.set('Invalid EMI ID.');
      return;
    }
    this.load();
  }

  payNow(): void {
    if (this.paying() || !this.details()?.canPay) return;
    this.paying.set(true);
    this.error.set(null);
    this.info.set(null);

    this.paymentApi.createOrder(this.emiId).subscribe({
      next: (order) => {
        if (order.paymentDevBypass) {
          this.completeWithDevBypass(order);
          return;
        }
        void this.openRazorpayCheckout(order);
      },
      error: () => {
        this.paying.set(false);
        this.error.set(this.paymentApi.error() ?? 'Unable to start EMI payment.');
      },
    });
  }

  downloadReceipt(): void {
    if (this.downloading() || !this.details()?.receiptAvailable) return;
    this.downloading.set(true);

    this.paymentApi.downloadReceipt(this.emiId).subscribe({
      next: (blob) => {
        this.downloading.set(false);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `emi-${this.details()?.emi.emiNumber ?? 'payment'}-receipt.pdf`;
        anchor.click();
        URL.revokeObjectURL(url);
        this.info.set('EMI receipt downloaded.');
      },
      error: () => {
        this.downloading.set(false);
        this.error.set(this.paymentApi.error() ?? 'Unable to download receipt.');
      },
    });
  }

  goToDashboard(): void {
    void this.router.navigateByUrl('/my-emi');
  }

  formatMoney(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return formatInr(value);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatStatus(value: string | null | undefined): string {
    if (!value) return '—';
    return value.replaceAll('_', ' ');
  }

  private load(): void {
    this.loading.set(true);
    this.paymentApi.getByEmiId(this.emiId).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.details.set(data);
        if (data.alreadyPaid) {
          this.info.set('This EMI is already paid. You can download the receipt below.');
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.paymentApi.error() ?? 'Unable to load EMI payment details.');
      },
    });
  }

  private completeWithDevBypass(order: CreateEmiPaymentOrderResponse): void {
    this.paymentApi.createDevBypassSignature(order.razorpayOrderId).subscribe({
      next: (signed) =>
        this.verifyAndNavigate({
          emiId: this.emiId,
          razorpayOrderId: signed.razorpayOrderId,
          razorpayPaymentId: signed.razorpayPaymentId,
          razorpaySignature: signed.razorpaySignature,
        }),
      error: () => {
        this.paying.set(false);
        this.error.set(this.paymentApi.error() ?? 'Dev payment bypass failed.');
      },
    });
  }

  private async openRazorpayCheckout(order: CreateEmiPaymentOrderResponse): Promise<void> {
    try {
      await openRazorpayCheckout({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        name: 'LoanEx',
        description: `EMI #${this.details()?.emi.emiNumber ?? ''} payment`,
        order_id: order.razorpayOrderId,
        prefill: order.prefill,
        notes: order.notes,
        theme: { color: '#0A2E6F' },
        handler: (response) => {
          this.verifyAndNavigate({
            emiId: this.emiId,
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

  private verifyAndNavigate(payload: {
    emiId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): void {
    this.paymentApi.verify(payload).subscribe({
      next: (result) => {
        this.paying.set(false);
        this.info.set(result.message || 'EMI payment successful.');
        void this.router.navigateByUrl('/my-emi', { replaceUrl: true });
      },
      error: () => {
        this.paying.set(false);
        this.error.set(this.paymentApi.error() ?? 'Payment verification failed.');
      },
    });
  }
}
