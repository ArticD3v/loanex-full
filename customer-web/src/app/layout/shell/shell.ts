import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { BREADCRUMB_LABELS } from '../data/layout-mock.data';
import { BreadcrumbItem } from '../models/layout.models';
import { LayoutUiService } from '../services/layout-ui.service';
import { Breadcrumb } from '../breadcrumb/breadcrumb';
import { Footer } from '../footer/footer';
import { Navbar } from '../navbar/navbar';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../features/cart/services/cart.service';
import { WishlistService } from '../../features/wishlist/services/wishlist.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Navbar, Breadcrumb, Footer],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly cartApi = inject(CartService);
  private readonly wishlistApi = inject(WishlistService);
  readonly ui = inject(LayoutUiService);

  private readonly currentUrl = signal(this.router.url);

  /** Shop listing uses the full content width (no centered card). */
  readonly fullWidthMain = computed(() => {
    const path = this.currentUrl().split('?')[0].split('#')[0];
    return path === '/products';
  });

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        this.ui.setBreadcrumbs(this.buildBreadcrumbs(event.urlAfterRedirects));
        this.ui.closeMobileNav();
      });

    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }

      if (this.auth.isAuthenticated()) {
        this.cartApi.getCart().subscribe({ error: () => this.ui.cartCount.set(0) });
        this.wishlistApi.getWishlist().subscribe({
          error: () => this.ui.wishlistCount.set(0),
        });
      } else {
        this.ui.cartCount.set(0);
        this.ui.wishlistCount.set(0);
      }

      const onScroll = () => this.ui.setScrolled(window.scrollY > 8);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
    });
  }

  private buildBreadcrumbs(url: string): BreadcrumbItem[] {
    const path = url.split('?')[0].split('#')[0];
    const segments = path.split('/').filter(Boolean);

    if (segments.length === 0) {
      return [{ label: 'Home', path: '/' }];
    }

    const items: BreadcrumbItem[] = [{ label: 'Home', path: '/' }];
    let acc = '';

    for (const segment of segments) {
      acc += `/${segment}`;
      items.push({
        label: BREADCRUMB_LABELS[segment] ?? this.toTitle(segment),
        path: acc,
      });
    }

    return items;
  }

  private toTitle(value: string): string {
    return value
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
