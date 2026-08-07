import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { formatInr } from '../../../../shared/utils/currency';
import {
  CheckoutApiService,
  CheckoutSessionResponse,
} from '../../services/checkout-api.service';

declare var Razorpay: any;

@Component({
  selector: 'app-direct-payment',
  imports: [],
  templateUrl: './direct-payment.html',
  styleUrl: './direct-payment.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DirectPaymentComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly checkoutApi = inject(CheckoutApiService);

  readonly formatInr = formatInr;
  readonly loading = signal(true);
  readonly processing = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<CheckoutSessionResponse | null>(null);

  ngOnInit(): void {
    const sessionId =
      this.route.snapshot.queryParamMap.get('sessionId') ||
      this.checkoutApi.getSavedSessionId();

    if (!sessionId) {
      this.loading.set(false);
      this.error.set('Checkout session not found. Please restart checkout.');
      return;
    }

    this.checkoutApi.getSession(sessionId).subscribe({
      next: (payload) => {
        this.loading.set(false);
        if (payload.session.purchaseType !== 'DIRECT') {
          this.error.set('This session is not a direct purchase.');
          return;
        }
        this.data.set(payload);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.checkoutApi.error() ?? 'Unable to load payment session.');
      },
    });
  }

  payNow(): void {
    if (this.processing()) return;
    this.processing.set(true);

    const payload = this.data();
    const amountInPaise = Math.round((payload?.session.totalAmount ?? 0) * 100);
    const razorpayKey = (window as any).RAZORPAY_KEY ?? 'rzp_test_TLQmOr6ccJBo6l';

    if (typeof Razorpay !== 'undefined') {
      const options = {
        key: razorpayKey,
        amount: amountInPaise,
        currency: 'INR',
        name: 'LoanEx FinTech',
        description: payload?.summary.product.name ?? 'Direct Order Payment',
        image: 'assets/images/loanex-logo.png',
        handler: (response: any) => {
          this.processing.set(false);
          void this.router.navigate(['/my-orders'], {
            queryParams: { paymentSuccess: 'true', paymentId: response.razorpay_payment_id },
          });
        },
        modal: {
          ondismiss: () => {
            this.processing.set(false);
          },
        },
        theme: {
          color: '#0A2540',
        },
      };

      try {
        const rzp = new Razorpay(options);
        rzp.open();
        return;
      } catch (err) {
        console.error('Razorpay launch error:', err);
      }
    }

    setTimeout(() => {
      this.processing.set(false);
      void this.router.navigate(['/my-orders'], {
        queryParams: { paymentSuccess: 'true' },
      });
    }, 1200);
  }

  goToCheckout(): void {
    const productId = this.data()?.session.productId;
    if (productId) {
      void this.router.navigate(['/checkout'], { queryParams: { productId } });
      return;
    }
    void this.router.navigateByUrl('/checkout');
  }
}
