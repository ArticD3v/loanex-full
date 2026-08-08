import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth.service';
import { ProfileService } from '../../../../checkout/services/profile.service';
import { formatInr } from '../../../../../shared/utils/currency';
import {
  ProductDetails,
  ProductKeySpec,
  VariantAttributeGroup,
} from '../../../models/product-details.models';
import {
  findVariantByAttributes,
  isAttributeOptionAvailable,
} from '../../../utils/map-product-details';

@Component({
  selector: 'app-product-info',
  templateUrl: './product-info.html',
  styleUrl: './product-info.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductInfoComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly profileApi = inject(ProfileService);

  readonly product = input.required<ProductDetails>();
  readonly wishlistActive = input(false);
  readonly apiRating = input<number | null>(null);
  readonly apiReviewCount = input<number | null>(null);

  readonly variantChange = output<string>();
  readonly wishlistToggle = output<void>();
  readonly shareClick = output<void>();
  readonly addToCart = output<void>();

  readonly selectedAttributes = signal<Record<string, string>>({});
  readonly wishlistActiveLocal = signal(false);
  readonly specsExpanded = signal(false);
  readonly profilePincode = signal<string | null>(null);

  readonly formatInr = formatInr;

  readonly deliveryPincode = computed(
    () => this.profilePincode() ?? this.product().deliveryPincode,
  );

  readonly attributeGroups = computed(() => this.product().attributeGroups ?? []);

  readonly matchedVariant = computed(() => {
    const groups = this.attributeGroups();
    if (groups.length === 0) return null;
    return findVariantByAttributes(this.product().productVariants ?? [], this.selectedAttributes());
  });

  constructor() {
    effect(() => {
      this.wishlistActiveLocal.set(this.wishlistActive());
    });

    effect(() => {
      const details = this.product();
      const variants = details.productVariants ?? [];
      const selectedId = details.selectedVariantId;
      const selected =
        variants.find((row) => row.id === selectedId) ??
        variants.find((row) => row.isDefault) ??
        variants[0];

      if (!selected) {
        this.selectedAttributes.set({});
        return;
      }

      const next: Record<string, string> = {};
      for (const group of details.attributeGroups ?? []) {
        const value = selected.attributes?.[group.key];
        if (value) next[group.key] = value;
      }
      this.selectedAttributes.set(next);
    });

    if (this.auth.isAuthenticated()) {
      this.loadDeliveryPincode();
    }
  }

  changeDeliveryAddress(): void {
    const returnUrl = this.router.url.split('?')[0] || '/';

    if (!this.auth.isAuthenticated()) {
      this.auth.setReturnUrl('/profile');
      void this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: '/profile' },
      });
      return;
    }

    void this.router.navigate(['/profile'], {
      fragment: 'addresses',
      queryParams: { from: returnUrl },
    });
  }

  private loadDeliveryPincode(): void {
    this.profileApi.get().subscribe({
      next: (data) => {
        const shipping =
          data.addresses.find((item) => item.isDefault && item.addressType === 'SHIPPING') ??
          data.addresses.find((item) => item.addressType === 'SHIPPING') ??
          data.address;
        if (shipping?.pincode) {
          this.profilePincode.set(shipping.pincode);
        }
      },
      error: () => {
        /* keep product fallback pincode */
      },
    });
  }

  stars(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }

  displayRating(): number {
    return this.apiRating() ?? this.product().rating;
  }

  displayReviewCount(): number {
    return this.apiReviewCount() ?? this.product().reviewCount;
  }

  visibleSpecs(specs: ProductKeySpec[]): ProductKeySpec[] {
    return this.specsExpanded() ? specs : specs.slice(0, 6);
  }

  isSelected(group: VariantAttributeGroup, value: string): boolean {
    return this.selectedAttributes()[group.key] === value;
  }

  isOptionDisabled(group: VariantAttributeGroup, value: string): boolean {
    const variants = this.product().productVariants ?? [];
    if (!variants.length) return false;
    const candidate = findVariantByAttributes(variants, {
      ...this.selectedAttributes(),
      [group.key]: value,
    });
    if (!candidate) return true;
    return !candidate.inStock && !isAttributeOptionAvailable(
      variants,
      this.selectedAttributes(),
      group.key,
      value,
    );
  }

  optionAvailable(group: VariantAttributeGroup, value: string): boolean {
    return isAttributeOptionAvailable(
      this.product().productVariants ?? [],
      this.selectedAttributes(),
      group.key,
      value,
    );
  }

  selectAttribute(group: VariantAttributeGroup, value: string): void {
    if (!this.optionAvailable(group, value)) return;
    const variants = this.product().productVariants ?? [];
    const next = { ...this.selectedAttributes(), [group.key]: value };
    this.selectedAttributes.set(next);

    let match = findVariantByAttributes(variants, next);

    // If exact combination is missing, keep other attributes and try to find nearest in-stock
    if (!match) {
      match =
        variants.find(
          (variant) =>
            variant.attributes?.[group.key] === value &&
            variant.inStock,
        ) ??
        variants.find(
          (variant) => variant.attributes?.[group.key] === value,
        ) ??
        null;

      if (match) {
        const synced: Record<string, string> = {};
        for (const attrGroup of this.attributeGroups()) {
          const attrValue = match.attributes?.[attrGroup.key];
          if (attrValue) synced[attrGroup.key] = attrValue;
        }
        this.selectedAttributes.set(synced);
      }
    }

    if (match) {
      this.variantChange.emit(match.id);
    }
  }

  toggleWishlist(): void {
    this.wishlistToggle.emit();
  }

  onShare(): void {
    this.shareClick.emit();
  }

  toggleSpecs(): void {
    this.specsExpanded.update((value) => !value);
  }
}
