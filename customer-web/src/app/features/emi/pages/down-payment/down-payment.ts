import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { formatInr } from '../../../../shared/utils/currency';
import {
  CreatePaymentOrderResponse,
  DownPaymentContext,
  PaymentService,
} from '../../services/payment.service';
import { openRazorpayCheckout } from '../../utils/razorpay-checkout';

@Component({
  selector: 'app-down-payment',
  templateUrl: './down-payment.html',
  styleUrl: './down-payment.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DownPaymentComponent implements OnInit {
  private readonly paymentApi = inject(PaymentService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly paying = signal(false);
  readonly error = signal<string | null>(null);
  readonly context = signal<DownPaymentContext | null>(null);
  private applicationId: string | undefined;

  readonly payLabel = computed(() => {
    const amount = this.context()?.paymentSummary.totalPayableToday;
    if (amount === undefined) return 'Pay Down Payment';
    return `Pay ${formatInr(amount)}`;
  });

  ngOnInit(): void {
    this.applicationId =
      this.route.snapshot.queryParamMap.get('applicationId') ?? undefined;
    this.loadContext();
  }

  formatMoney(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return formatInr(value);
  }

  pay(): void {
    if (this.paying()) return;
    this.paying.set(true);
    this.error.set(null);

    this.paymentApi.createOrder(this.applicationId).subscribe({
      next: (order) => {
        this.applicationId = order.applicationId || this.applicationId;
        if (order.paymentDevBypass) {
          this.completeWithDevBypass(order);
          return;
        }
        void this.openCheckout(order);
      },
      error: (err: unknown) => {
        this.paying.set(false);
        this.error.set(this.paymentApi.error() ?? 'Unable to start payment.');
        this.redirectFromError(err);
      },
    });
  }

  private loadContext(): void {
    this.loading.set(true);
    this.paymentApi.getDownPaymentContext(this.applicationId).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.context.set(data);
        this.applicationId = data.applicationId || this.applicationId;
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(this.paymentApi.error() ?? 'Unable to load down payment details.');
        this.redirectFromError(err);
      },
    });
  }

  private completeWithDevBypass(order: CreatePaymentOrderResponse): void {
    this.paymentApi.createDevBypassSignature(order.razorpayOrderId).subscribe({
      next: (signed) => this.verifyAndNavigate(signed),
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
        description: 'EMI Down Payment',
        order_id: order.razorpayOrderId,
        prefill: order.prefill,
        notes: order.notes,
        theme: { color: '#1a56db' },
        handler: (response) => {
          this.verifyAndNavigate({
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
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): void {
    this.paymentApi.verify(payload).subscribe({
      next: (result) => {
        this.paying.set(false);
        const orderRef = result.orderNumber || result.orderId;
        if (orderRef) {
          void this.router.navigate(['/orders', orderRef], {
            queryParams: { autopay: 1 },
            replaceUrl: true,
          });
          return;
        }
        void this.router.navigate(['/my-orders'], {
          queryParams: {
            paymentSuccess: 'true',
            paymentId: payload.razorpayPaymentId,
            ...(result.alreadyProcessed ? { alreadyProcessed: 'true' } : {}),
          },
          replaceUrl: true,
        });
      },
      error: () => {
        this.paying.set(false);
        this.error.set(this.paymentApi.error() ?? 'Payment verification failed.');
      },
    });
  }

  private redirectFromError(err: unknown): void {
    const body = err as {
      error?: {
        details?: {
          status?: string;
          code?: string;
          nextStep?: string;
          orderNumber?: string | null;
          orderId?: string | null;
        };
        code?: string;
      };
    };
    const status = body?.error?.details?.status;
    const code = body?.error?.details?.code ?? body?.error?.code;
    const next = body?.error?.details?.nextStep;
    const orderNumber = body?.error?.details?.orderNumber;
    const orderId = body?.error?.details?.orderId;
    const q = this.applicationId ? { applicationId: this.applicationId } : undefined;

    if (code === 'PAYMENT_ALREADY_COMPLETED' || next === 'ORDER_CONFIRMATION') {
      if (orderNumber || orderId) {
        void this.router.navigate(['/order/confirmation'], {
          queryParams: {
            ...(orderNumber ? { orderNumber } : {}),
            ...(orderId ? { orderId } : {}),
            paymentSuccess: 'true',
            alreadyProcessed: 'true',
          },
          replaceUrl: true,
        });
        return;
      }
      void this.router.navigateByUrl('/my-orders');
      return;
    }

    if (status === 'APPROVED') {
      void this.router.navigate(['/application/approved'], { queryParams: q });
      return;
    }

    if (status === 'PENDING' || status === 'UNDER_REVIEW') {
      void this.router.navigate(['/application/pending'], { queryParams: q });
      return;
    }

    if (status === 'REJECTED') {
      void this.router.navigate(['/application/rejected'], { queryParams: q });
    }
  }
}
