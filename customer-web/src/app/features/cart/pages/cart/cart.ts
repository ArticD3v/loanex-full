import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { formatInr } from '../../../../shared/utils/currency';
import { AuthService } from '../../../../core/services/auth.service';
import { CheckoutIntentService } from '../../../checkout/services/checkout-intent.service';
import { CartItem, CartResponse, CartService } from '../../services/cart.service';

@Component({
  selector: 'app-cart',
  imports: [RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartComponent implements OnInit {
  private readonly cartApi = inject(CartService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly checkoutIntent = inject(CheckoutIntentService);

  readonly formatInr = formatInr;
  readonly loading = signal(true);
  readonly acting = signal(false);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  readonly cart = signal<CartResponse | null>(null);

  ngOnInit(): void {
    this.load();
  }

  increase(item: CartItem): void {
    this.updateQty(item, item.quantity + 1);
  }

  decrease(item: CartItem): void {
    this.updateQty(item, item.quantity - 1);
  }

  remove(item: CartItem): void {
    if (this.acting()) return;
    this.acting.set(true);
    this.error.set(null);

    this.cartApi.removeItem(item.id).subscribe({
      next: (data) => {
        this.acting.set(false);
        this.cart.set(data);
        this.info.set('Item removed from cart.');
      },
      error: () => {
        this.acting.set(false);
        this.error.set(this.cartApi.error() ?? 'Unable to remove item.');
      },
    });
  }

  clearCart(): void {
    if (this.acting() || !this.cart()?.items.length) return;
    this.acting.set(true);
    this.error.set(null);

    this.cartApi.clear().subscribe({
      next: (data) => {
        this.acting.set(false);
        this.cart.set(data);
        this.info.set('Cart cleared.');
      },
      error: () => {
        this.acting.set(false);
        this.error.set(this.cartApi.error() ?? 'Unable to clear cart.');
      },
    });
  }

  moveToWishlist(item: CartItem): void {
    if (this.acting()) return;
    this.acting.set(true);
    this.error.set(null);

    this.cartApi.moveToWishlist(item.id).subscribe({
      next: (data) => {
        this.acting.set(false);
        this.cart.set(data);
        this.info.set('Item moved to wishlist.');
      },
      error: () => {
        this.acting.set(false);
        this.error.set(this.cartApi.error() ?? 'Unable to move item to wishlist.');
      },
    });
  }

  proceedToCheckout(): void {
    const data = this.cart();
    if (!data?.items.length) {
      this.error.set('Your cart is empty.');
      return;
    }

    const outOfStock = data.items.some(item => !item.product.inStock);
    if (outOfStock) {
      this.error.set('Remove out-of-stock items before checkout.');
      return;
    }

    this.checkoutIntent.save({
      productId: 'CART',
      quantity: 1,
      mode: 'CART',
    });

    void this.router.navigate(['/checkout'], {
      queryParams: {
        mode: 'cart',
        fromCart: '1',
      },
    });
  }

  stockLabel(status: string): string {
    if (status === 'OUT_OF_STOCK') return 'Out of Stock';
    if (status === 'LOW_STOCK') return 'Low Stock';
    return 'In Stock';
  }

  private updateQty(item: CartItem, quantity: number): void {
    if (this.acting()) return;
    if (quantity < 0) return;

    this.acting.set(true);
    this.error.set(null);

    this.cartApi.updateQuantity(item.id, quantity).subscribe({
      next: (data) => {
        this.acting.set(false);
        this.cart.set(data);
      },
      error: () => {
        this.acting.set(false);
        this.error.set(this.cartApi.error() ?? 'Unable to update quantity.');
      },
    });
  }

  private load(): void {
    if (!this.auth.isAuthenticated()) {
      this.loading.set(false);
      this.error.set('Please log in to view your cart.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.cartApi.getCart().subscribe({
      next: (data) => {
        this.loading.set(false);
        this.cart.set(data);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.cartApi.error() ?? 'Unable to load cart.');
      },
    });
  }
}
