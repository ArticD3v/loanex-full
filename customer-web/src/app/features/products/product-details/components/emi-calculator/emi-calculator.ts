import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth.service';
import { CartService } from '../../../../cart/services/cart.service';
import { CheckoutIntentService } from '../../../../checkout/services/checkout-intent.service';
import { ProfileService } from '../../../../checkout/services/profile.service';
import { EmiApplicationService } from '../../../../emi/services/emi-application.service';
import { EmiPlanSelectionService } from '../../../../emi/services/emi-plan-selection.service';
import { formatInr } from '../../../../../shared/utils/currency';
import { buildEmiPlans, buildPlanSummary } from '../../../utils/emi-calc.helper';
import { PlanCardComponent } from '../plan-card/plan-card';

@Component({
  selector: 'app-emi-calculator',
  imports: [PlanCardComponent],
  templateUrl: './emi-calculator.html',
  styleUrl: './emi-calculator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmiCalculatorComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly emiPlan = inject(EmiPlanSelectionService);
  private readonly emiApi = inject(EmiApplicationService);
  private readonly checkoutIntent = inject(CheckoutIntentService);
  private readonly profileApi = inject(ProfileService);
  private readonly cartApi = inject(CartService);

  readonly productId = input.required<string>();
  readonly variantId = input<string | null>(null);
  readonly productName = input.required<string>();
  readonly productPrice = input.required<number>();
  readonly inStock = input(true);
  readonly emiPlans = input<import('../../../models/product-details.models').ProductEmiPlan[]>([]);

  readonly selectedTenure = signal(0);
  readonly proceeding = signal(false);
  readonly addingToCart = signal(false);
  readonly cartMessage = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);

  readonly formatInr = formatInr;

  readonly plans = computed(() =>
    buildEmiPlans(this.productPrice(), 0, this.emiPlans()),
  );

  readonly activePlan = computed(() => {
    const list = this.plans();
    if (!list.length) return null;
    const tenure = this.selectedTenure();
    const found = tenure > 0 ? list.find((plan) => plan.months === tenure) : undefined;
    return found ?? list.find((plan) => plan.recommended) ?? list[0];
  });

  readonly summary = computed(() => {
    const plan = this.activePlan();
    if (!plan) return null;
    return buildPlanSummary(this.productPrice(), plan.downPayment, plan);
  });

  selectPlan(months: number): void {
    this.selectedTenure.set(months);
    this.actionError.set(null);
  }

  private flashError(message: string): void {
    this.actionError.set(message);
    window.setTimeout(() => {
      if (this.actionError() === message) this.actionError.set(null);
    }, 3200);
  }

  proceedWithEmi(): void {
    if (this.proceeding()) return;

    const plan = this.activePlan();
    if (!plan) {
      this.flashError('No EMI plan is available for this product yet.');
      return;
    }

    const downPayment = plan.downPayment;
    const sellingPrice = this.productPrice();

    // EMI uses emiPlan selection — clear any stale BUY_NOW checkout intent so a
    // previous productId (e.g. deleted id_…) is not reused for every product.
    this.checkoutIntent.clear();
    this.emiPlan.save({
      productId: this.productId(),
      variantId: this.variantId() ?? undefined,
      productName: this.productName(),
      sellingPrice,
      requestedAmount: Math.max(sellingPrice - downPayment, 0),
      requestedDownPayment: downPayment,
      requestedTenure: plan.months,
      estimatedMonthlyEmi: plan.monthlyEmi,
    });

    const personalDetailsDestination = '/checkout/personal-details';

    if (!this.auth.isAuthenticated()) {
      this.auth.setReturnUrl(personalDetailsDestination);
      void this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: personalDetailsDestination },
      });
      return;
    }

    this.proceeding.set(true);
    this.actionError.set(null);
    this.emiApi.getStatus().subscribe({
      next: (status) => {
        this.proceeding.set(false);
        void this.router.navigateByUrl(
          this.resolveDestination(
            status.status,
            status.hasApplication,
            status.canSubmitAnother,
          ),
        );
      },
      error: () => {
        this.proceeding.set(false);
        void this.router.navigateByUrl(personalDetailsDestination);
      },
    });
  }

  buyNow(): void {
    if (this.proceeding()) return;

    const productId = this.productId();
    const variantId = this.variantId();
    this.checkoutIntent.save({
      productId,
      variantId: variantId ?? undefined,
      quantity: 1,
      mode: 'BUY_NOW',
    });

    const checkoutDestination = `/checkout?productId=${encodeURIComponent(productId)}${
      variantId ? `&variantId=${encodeURIComponent(variantId)}` : ''
    }`;
    const personalDetailsDestination = '/checkout/personal-details';

    if (!this.auth.isAuthenticated()) {
      this.auth.setReturnUrl(checkoutDestination);
      void this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: checkoutDestination },
      });
      return;
    }

    this.proceeding.set(true);
    this.actionError.set(null);
    this.profileApi.get().subscribe({
      next: (profile) => {
        this.proceeding.set(false);
        const ready = profile.hasProfile && profile.hasAddress;
        void this.router.navigateByUrl(
          ready ? checkoutDestination : personalDetailsDestination,
        );
      },
      error: () => {
        this.proceeding.set(false);
        void this.router.navigateByUrl(personalDetailsDestination);
      },
    });
  }

  addToCart(): void {
    if (this.addingToCart() || this.proceeding()) return;

    const productId = this.productId();
    const variantId = this.variantId() ?? undefined;
    const returnUrl = `/products/${productId}`;

    if (!this.auth.isAuthenticated()) {
      this.auth.setReturnUrl(returnUrl);
      void this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl },
      });
      return;
    }

    this.addingToCart.set(true);
    this.cartMessage.set(null);
    this.actionError.set(null);

    this.cartApi.addItem(productId, 1, variantId).subscribe({
      next: () => {
        this.addingToCart.set(false);
        this.cartMessage.set('Added to Cart');
        window.setTimeout(() => this.cartMessage.set(null), 1800);
      },
      error: () => {
        this.addingToCart.set(false);
        const message = this.cartApi.error() ?? 'Unable to add to cart';
        this.cartMessage.set(message);
        this.flashError(message);
        window.setTimeout(() => this.cartMessage.set(null), 2200);
      },
    });
  }

  private resolveDestination(
    status: string | null | undefined,
    hasApplication: boolean,
    canSubmitAnother?: boolean,
  ): string {
    // Completed / closed EMI applications must not trap "Proceed EMI" on My Orders.
    if (!hasApplication || !status || canSubmitAnother) {
      return '/checkout/personal-details';
    }

    switch (status) {
      case 'PENDING':
      case 'UNDER_REVIEW':
        return '/application/pending';
      case 'APPROVED':
        return '/application/approved';
      case 'OFFER_ACCEPTED':
      case 'DOWN_PAYMENT_PENDING':
        return '/application/down-payment';
      case 'REJECTED':
        return '/application/rejected';
      case 'DECLINED_BY_CUSTOMER':
        return '/checkout/personal-details';
      default:
        return '/checkout/personal-details';
    }
  }
}
