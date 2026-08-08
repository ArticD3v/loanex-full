import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { formatInr } from '../../../../shared/utils/currency';
import {
  EmiApplicationService,
  EmiReviewContext,
} from '../../../emi/services/emi-application.service';
import {
  CreateKycFeeOrderResponse,
  PaymentService,
} from '../../../emi/services/payment.service';
import {
  EmiPlanSelection,
  EmiPlanSelectionService,
} from '../../../emi/services/emi-plan-selection.service';
import { openRazorpayCheckout } from '../../../emi/utils/razorpay-checkout';

@Component({
  selector: 'app-verification-summary',
  imports: [RouterLink],
  templateUrl: './verification-summary.html',
  styleUrl: './verification-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationSummaryComponent implements OnInit {
  private readonly emiApi = inject(EmiApplicationService);
  private readonly emiPlan = inject(EmiPlanSelectionService);
  private readonly paymentApi = inject(PaymentService);
  private readonly router = inject(Router);

  readonly formatInr = formatInr;
  readonly loading = this.emiApi.loading;
  readonly error = signal<string | null>(null);
  readonly planMissing = signal(false);
  readonly review = signal<EmiReviewContext | null>(null);
  readonly accepted = signal(false);
  readonly acceptedOneTimePayment = signal(false);
  readonly submitting = signal(false);
  readonly feePaidContinue = signal(false);

  readonly product = signal<EmiPlanSelection | null>(null);
  readonly alreadySubmitted = computed(() => Boolean(this.review()?.activeApplication));

  readonly canSubmit = computed(() => {
    const ctx = this.review();
    const plan = this.product();
    return Boolean(
      ctx?.verification.canSubmit &&
        this.accepted() &&
        this.acceptedOneTimePayment() &&
        plan &&
        !this.submitting() &&
        !this.alreadySubmitted(),
    );
  });

  ngOnInit(): void {
    this.emiPlan.loadDurable().subscribe({
      next: (plan) => {
        if (!plan?.productId) {
          this.planMissing.set(true);
          this.error.set(
            'EMI plan selection is missing. Go back to the product page, choose an EMI plan, then return here. You have not been redirected away.',
          );
          this.loadReviewOnly();
          return;
        }
        this.planMissing.set(false);
        this.product.set(plan);
        this.loadReviewOnly();
      },
      error: () => {
        this.planMissing.set(true);
        this.error.set(
          'EMI plan selection is missing. Please choose a product and EMI plan before submitting.',
        );
        this.loadReviewOnly();
      },
    });
  }

  private loadReviewOnly(): void {
    this.emiApi.getReview().subscribe({
      next: (data) => {
        this.review.set(data);
        // If plan still missing, try recover from active application fields.
        if (!this.product()?.productId && data.activeApplication?.productId) {
          const app = data.activeApplication;
          const recovered: EmiPlanSelection = {
            productId: app.productId,
            productName: app.productName ?? '',
            sellingPrice: Number(app.sellingPrice ?? 0),
            requestedAmount: Number(app.requestedAmount ?? 0),
            requestedDownPayment: Number(app.requestedDownPayment ?? 0),
            requestedTenure: Number(app.requestedTenure ?? 12),
            estimatedMonthlyEmi: Number(app.estimatedMonthlyEmi ?? 0),
          };
          this.product.set(recovered);
          this.emiPlan.save(recovered);
          this.planMissing.set(false);
          this.error.set(null);
        }
      },
      error: () => {
        this.error.set(this.emiApi.error() ?? 'Unable to load verification summary.');
      },
    });
  }

  onAcceptChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.accepted.set(checked);
  }

  onOneTimePaymentAcceptChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.acceptedOneTimePayment.set(checked);
  }

  submitApplication(): void {
    if (!this.canSubmit()) return;

    const plan = this.product();
    if (!plan) {
      this.planMissing.set(true);
      this.error.set('Product EMI selection is missing. Please choose an EMI plan again.');
      return;
    }

    this.error.set(null);
    this.feePaidContinue.set(false);
    this.submitting.set(true);

    this.paymentApi.getKycFeeStatus().subscribe({
      next: (status) => {
        if (status.paid) {
          this.continueEmiSubmission(plan);
          return;
        }
        this.startKycFeePayment(plan);
      },
      error: () => {
        this.submitting.set(false);
        this.error.set(
          this.paymentApi.error() ?? 'Unable to check KYC verification fee status.',
        );
      },
    });
  }

  /** Continue after fee was paid (webhook) but EMI submit did not finish. */
  continueAfterPaidFee(): void {
    const plan = this.product();
    if (!plan) {
      this.planMissing.set(true);
      this.error.set('EMI plan is missing. Select a plan from the product page, then continue.');
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    this.paymentApi.getKycFeeStatus().subscribe({
      next: (status) => {
        if (!status.paid) {
          this.submitting.set(false);
          this.feePaidContinue.set(false);
          this.error.set('KYC fee is not marked paid yet. Please complete payment.');
          return;
        }
        this.continueEmiSubmission(plan);
      },
      error: () => {
        this.submitting.set(false);
        this.error.set(this.paymentApi.error() ?? 'Unable to re-check KYC fee status.');
      },
    });
  }

  private startKycFeePayment(plan: EmiPlanSelection): void {
    this.paymentApi.createKycFeeOrder().subscribe({
      next: (order) => {
        if (order.paymentDevBypass) {
          this.completeKycFeeWithDevBypass(order, plan);
          return;
        }
        void this.openKycFeeCheckout(order, plan);
      },
      error: (err: unknown) => {
        const code = (err as { error?: { code?: string; details?: { code?: string } } })?.error
          ?.code;
        const detailCode = (err as { error?: { details?: { code?: string } } })?.error?.details
          ?.code;
        if (code === 'KYC_FEE_ALREADY_PAID' || detailCode === 'KYC_FEE_ALREADY_PAID') {
          this.continueEmiSubmission(plan);
          return;
        }
        this.submitting.set(false);
        this.error.set(this.paymentApi.error() ?? 'Unable to start KYC verification payment.');
      },
    });
  }

  private completeKycFeeWithDevBypass(
    order: CreateKycFeeOrderResponse,
    plan: EmiPlanSelection,
  ): void {
    this.paymentApi.createDevBypassSignature(order.razorpayOrderId).subscribe({
      next: (signed) => this.verifyKycFeeThenSubmit(signed, plan),
      error: () => {
        this.submitting.set(false);
        this.error.set(this.paymentApi.error() ?? 'Dev KYC payment bypass failed.');
      },
    });
  }

  private async openKycFeeCheckout(
    order: CreateKycFeeOrderResponse,
    plan: EmiPlanSelection,
  ): Promise<void> {
    try {
      await openRazorpayCheckout({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        name: 'LoanEx',
        description: 'KYC Verification Fee (one-time)',
        order_id: order.razorpayOrderId,
        prefill: order.prefill,
        notes: order.notes,
        theme: { color: '#1a56db' },
        handler: (response) => {
          this.verifyKycFeeThenSubmit(
            {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            },
            plan,
          );
        },
        modal: {
          ondismiss: () => {
            this.submitting.set(false);
            this.error.set('KYC verification payment was cancelled. Please try again to submit.');
          },
        },
      });
    } catch {
      this.submitting.set(false);
      this.error.set('Unable to open Razorpay checkout. Please try again.');
    }
  }

  private verifyKycFeeThenSubmit(
    signed: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
    plan: EmiPlanSelection,
  ): void {
    this.paymentApi.verifyKycFee(signed).subscribe({
      next: () => this.continueEmiSubmission(plan),
      error: () => {
        // Client verify may fail while webhook marks SUCCESS — re-check Mongo SoT.
        this.paymentApi.getKycFeeStatus().subscribe({
          next: (status) => {
            if (status.paid) {
              this.continueEmiSubmission(plan);
              return;
            }
            this.submitting.set(false);
            this.feePaidContinue.set(true);
            this.error.set(
              this.paymentApi.error() ??
                'KYC payment verification is still pending. If you were charged, wait a moment and tap Continue — you will not be charged again.',
            );
          },
          error: () => {
            this.submitting.set(false);
            this.feePaidContinue.set(true);
            this.error.set(
              this.paymentApi.error() ??
                'KYC payment verification failed. If payment succeeded, tap Continue after a moment.',
            );
          },
        });
      },
    });
  }

  private continueEmiSubmission(plan: EmiPlanSelection): void {
    this.emiApi
      .submit({
        productId: plan.productId,
        productName: plan.productName,
        sellingPrice: plan.sellingPrice,
        requestedAmount: plan.requestedAmount,
        requestedDownPayment: plan.requestedDownPayment,
        requestedTenure: plan.requestedTenure,
        estimatedMonthlyEmi: plan.estimatedMonthlyEmi,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.emiPlan.clear();
          void this.router.navigateByUrl('/application/pending');
        },
        error: () => {
          this.submitting.set(false);
          // Fee may already be paid — allow Continue without re-charging.
          this.feePaidContinue.set(true);
          this.error.set(this.emiApi.error());
        },
      });
  }
}
