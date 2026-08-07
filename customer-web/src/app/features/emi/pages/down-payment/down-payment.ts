import {

  ChangeDetectionStrategy,

  Component,

  OnInit,

  computed,

  inject,

  signal,

} from '@angular/core';

import { Router } from '@angular/router';

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



  readonly loading = signal(true);

  readonly paying = signal(false);

  readonly error = signal<string | null>(null);

  readonly context = signal<DownPaymentContext | null>(null);



  readonly payLabel = computed(() => {

    const amount = this.context()?.paymentSummary.totalPayableToday;

    if (amount === undefined) return 'Pay Down Payment';

    return `Pay ${formatInr(amount)}`;

  });



  ngOnInit(): void {

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



    this.paymentApi.createOrder().subscribe({

      next: (order) => {

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

    this.paymentApi.getDownPaymentContext().subscribe({

      next: (data) => {

        this.loading.set(false);

        this.context.set(data);

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

        description: `Down payment for ${order.applicationNumber}`,

        order_id: order.razorpayOrderId,

        prefill: order.prefill,

        notes: order.notes,

        theme: { color: '#0A2E6F' },

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

        if (result.orderId) {

          void this.router.navigate(['/orders', result.orderId], {

            queryParams: { autopay: 1 },

          });

          return;

        }

        void this.router.navigate(['/order/confirmation'], {

          queryParams: result.orderNumber

            ? { orderNumber: result.orderNumber }

            : undefined,

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

      error?: { details?: { status?: string; code?: string; nextStep?: string }; code?: string };

    };

    const status = body?.error?.details?.status;

    const code = body?.error?.details?.code ?? body?.error?.code;

    const next = body?.error?.details?.nextStep;



    if (code === 'PAYMENT_ALREADY_COMPLETED' || next === 'ORDER_CONFIRMATION') {

      void this.router.navigateByUrl('/order/confirmation');

      return;

    }



    if (status === 'APPROVED') {

      void this.router.navigateByUrl('/application/approved');

      return;

    }



    if (status === 'PENDING' || status === 'UNDER_REVIEW') {

      void this.router.navigateByUrl('/application/pending');

      return;

    }



    if (status === 'REJECTED') {

      void this.router.navigateByUrl('/application/rejected');

    }

  }

}

