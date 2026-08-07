import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { formatInr } from '../../../../shared/utils/currency';
import {
  EmiApplicationService,
  EmiReviewContext,
} from '../../../emi/services/emi-application.service';
import {
  EmiPlanSelection,
  EmiPlanSelectionService,
} from '../../../emi/services/emi-plan-selection.service';

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
  private readonly router = inject(Router);

  readonly formatInr = formatInr;
  readonly loading = this.emiApi.loading;
  readonly error = signal<string | null>(null);
  readonly review = signal<EmiReviewContext | null>(null);
  readonly accepted = signal(false);
  readonly submitting = signal(false);

  readonly product = signal<EmiPlanSelection | null>(null);

  readonly canSubmit = computed(() => {
    const ctx = this.review();
    const plan = this.product();
    return Boolean(ctx?.verification.canSubmit && this.accepted() && plan && !this.submitting());
  });

  ngOnInit(): void {
    const stored = this.emiPlan.get();
    this.product.set(
      stored ?? {
        productId: 'laptop-hp-pavilion-15',
        productName: 'HP Pavilion 15 Laptop',
        sellingPrice: 54990,
        requestedAmount: 32994,
        requestedDownPayment: 10998,
        requestedTenure: 6,
        estimatedMonthlyEmi: 5500,
      },
    );

    this.emiApi.getReview().subscribe({
      next: (data) => {
        this.review.set(data);
        if (data.activeApplication) {
          void this.router.navigateByUrl('/application/pending');
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

  submitApplication(): void {
    if (!this.canSubmit()) return;

    const plan = this.product();
    if (!plan) {
      this.error.set('Product EMI selection is missing. Please choose an EMI plan again.');
      return;
    }

    this.error.set(null);
    this.submitting.set(true);

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
          void this.router.navigateByUrl('/application/pending');
        },
        error: () => {
          this.submitting.set(false);
          this.error.set(this.emiApi.error());
        },
      });
  }
}
