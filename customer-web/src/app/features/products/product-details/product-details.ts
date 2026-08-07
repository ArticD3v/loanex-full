import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../cart/services/cart.service';
import { WishlistService } from '../../wishlist/services/wishlist.service';
import { LayoutUiService } from '../../../layout/services/layout-ui.service';
import {
  DELIVERY_STEPS,
  TRUST_BADGES,
} from '../data/pdp-static.data';
import {
  BreadcrumbTrailItem,
  ProductDetails as ProductDetailsModel,
  TrustBadge,
} from '../models/product-details.models';
import { ProductsApiService } from '../services/products-api.service';
import { toProductCardItem } from '../utils/map-catalog-product-card';
import { applyVariantToDetails, mapProductDetails } from '../utils/map-product-details';
import { ProductCardItem } from '../../../shared/models/product-card.model';
import { EmiCalculatorComponent } from './components/emi-calculator/emi-calculator';
import { ProductGalleryComponent } from './components/product-gallery/product-gallery';
import { ProductInfoComponent } from './components/product-info/product-info';
import { RelatedProductsComponent } from './components/related-products/related-products';
import { SpecificationComponent, RatingSummary } from './components/specification/specification';

@Component({
  selector: 'app-product-details',
  imports: [
    ProductGalleryComponent,
    ProductInfoComponent,
    EmiCalculatorComponent,
    SpecificationComponent,
    RelatedProductsComponent,
  ],
  templateUrl: './product-details.html',
  styleUrl: './product-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetails {
  /** Bound from route `:productId` via withComponentInputBinding(). */
  readonly productId = input<string>('');

  private readonly productsApi = inject(ProductsApiService);
  private readonly layoutUi = inject(LayoutUiService);
  private readonly cartApi = inject(CartService);
  private readonly wishlistApi = inject(WishlistService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly product = signal<ProductDetailsModel | null>(null);
  readonly relatedProducts = signal<ProductCardItem[]>([]);

  readonly deliverySteps = DELIVERY_STEPS;
  readonly cartNotice = signal<string | null>(null);
  readonly wishlistActive = signal(false);
  readonly wishlistItemId = signal<string | null>(null);
  readonly reviewSummary = signal<RatingSummary | null>(null);

  readonly trustBadges = computed<TrustBadge[]>(() => {
    const p = this.product();
    if (!p) return TRUST_BADGES;

    const deliveryTitle =
      p.deliveryCharge && p.deliveryCharge > 0
        ? `Delivery ₹${Math.round(p.deliveryCharge).toLocaleString('en-IN')}`
        : 'Free Delivery';
    const deliverySubtitle =
      p.deliveryDays && p.deliveryDays > 0
        ? `Usually in ${p.deliveryDays} days`
        : 'Fast & Reliable';

    const replacementMatch = p.warrantyLabel?.match(/(\d+)\s*day/i);
    const returnsDays =
      p.returnsPolicy?.[0]?.match(/(\d+)\s*-?\s*day/i)?.[1] ||
      replacementMatch?.[1] ||
      '7';

    return [
      {
        id: 'delivery',
        icon: 'pi pi-truck',
        title: deliveryTitle,
        subtitle: deliverySubtitle,
      },
      {
        id: 'replacement',
        icon: 'pi pi-refresh',
        title: `${returnsDays} Days Replacement`,
        subtitle: 'No questions asked',
      },
      TRUST_BADGES[2],
      TRUST_BADGES[3],
    ];
  });

  constructor() {
    effect(() => {
      const id = this.productId();
      untracked(() => this.loadProduct(id));
    });
  }

  onVariantChange(variantId: string): void {
    const details = this.product();
    if (!details) return;

    const variant = details.productVariants.find((row) => row.id === variantId);
    if (!variant) return;

    const updated = applyVariantToDetails(details, variant, true);
    this.product.set(updated);
    this.layoutUi.setBreadcrumbs(
      updated.breadcrumbs.map((item: BreadcrumbTrailItem) => ({
        label: item.label,
        path: item.path,
      })),
    );
    this.loadWishlistStatus(details.id, variantId);
  }

  onAddToCart(): void {
    const details = this.product();
    if (!details) return;

    const productId = details.id;
    const variantId = details.selectedVariantId ?? undefined;

    if (!this.auth.isAuthenticated()) {
      this.auth.setReturnUrl(`/products/${productId}`);
      void this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: `/products/${productId}` },
      });
      return;
    }

    this.cartApi.addItem(productId, 1, variantId).subscribe({
      next: () => {
        this.cartNotice.set('Added to cart');
        window.setTimeout(() => this.cartNotice.set(null), 1800);
      },
      error: () => {
        this.cartNotice.set(this.cartApi.error() ?? 'Unable to add to cart');
        window.setTimeout(() => this.cartNotice.set(null), 2200);
      },
    });
  }

  onWishlistToggle(): void {
    const details = this.product();
    if (!details) return;

    const productId = details.id;
    const variantId = details.selectedVariantId ?? undefined;

    if (!this.auth.isAuthenticated()) {
      this.auth.setReturnUrl(`/products/${productId}`);
      void this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: `/products/${productId}` },
      });
      return;
    }

    if (this.wishlistActive()) {
      const id = this.wishlistItemId();
      if (!id) return;

      this.wishlistApi.removeItem(id).subscribe({
        next: () => {
          this.wishlistActive.set(false);
          this.wishlistItemId.set(null);
          this.cartNotice.set('Removed from wishlist');
          window.setTimeout(() => this.cartNotice.set(null), 1800);
        },
        error: () => {
          this.cartNotice.set(this.wishlistApi.error() ?? 'Unable to update wishlist');
          window.setTimeout(() => this.cartNotice.set(null), 2200);
        },
      });
      return;
    }

    this.wishlistApi.addItem(productId, variantId).subscribe({
      next: (data) => {
        this.wishlistActive.set(true);
        this.wishlistItemId.set(data.item?.id ?? null);
        this.cartNotice.set('Added to wishlist');
        window.setTimeout(() => this.cartNotice.set(null), 1800);
      },
      error: () => {
        this.cartNotice.set(this.wishlistApi.error() ?? 'Unable to add to wishlist');
        window.setTimeout(() => this.cartNotice.set(null), 2200);
      },
    });
  }

  private loadProduct(id: string): void {
    if (!id?.trim()) {
      this.loading.set(false);
      this.error.set('Product not found.');
      this.product.set(null);
      this.relatedProducts.set([]);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.product.set(null);
    this.relatedProducts.set([]);
    this.productsApi.clearError();

    this.productsApi
      .getById(id)
      .pipe(
        catchError(() => this.productsApi.getBySlug(id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (detail) => {
          const mapped = mapProductDetails(detail);
          this.product.set(mapped);
          this.loading.set(false);
          this.error.set(null);

          this.layoutUi.setBreadcrumbs(
            mapped.breadcrumbs.map((item: BreadcrumbTrailItem) => ({
              label: item.label,
              path: item.path,
            })),
          );
          this.loadWishlistStatus(mapped.id, mapped.selectedVariantId ?? undefined);
          this.loadRelatedProducts(detail.id, detail.category);
        },
        error: () => {
          this.loading.set(false);
          this.error.set(this.productsApi.error() ?? 'Unable to load product.');
          this.product.set(null);
          this.relatedProducts.set([]);
        },
      });
  }

  private loadRelatedProducts(currentId: string, category: string): void {
    this.productsApi
      .list({ category, limit: 6 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.relatedProducts.set(
            data.items
              .filter((item) => item.id !== currentId)
              .slice(0, 6)
              .map((item) => toProductCardItem(item)),
          );
        },
        error: () => {
          this.relatedProducts.set([]);
        },
      });
  }

  private loadWishlistStatus(productId: string, variantId?: string): void {
    if (!this.auth.isAuthenticated()) {
      this.wishlistActive.set(false);
      this.wishlistItemId.set(null);
      return;
    }

    this.wishlistApi.getStatus(productId, variantId).subscribe({
      next: (status) => {
        this.wishlistActive.set(status.inWishlist);
        this.wishlistItemId.set(status.wishlistItemId);
      },
      error: () => {
        this.wishlistActive.set(false);
        this.wishlistItemId.set(null);
      },
    });
  }
}
