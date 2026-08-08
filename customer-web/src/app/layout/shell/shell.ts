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
import {
  BREADCRUMB_ID_PARENT_LABELS,
  BREADCRUMB_LABELS,
} from '../data/layout-mock.data';
import { BreadcrumbItem } from '../models/layout.models';
import { LayoutUiService } from '../services/layout-ui.service';
import { Breadcrumb } from '../breadcrumb/breadcrumb';
import { Footer } from '../footer/footer';
import { Navbar } from '../navbar/navbar';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../features/cart/services/cart.service';
import { WishlistService } from '../../features/wishlist/services/wishlist.service';

/** UUID / ObjectId-style path segments that should not be title-cased into breadcrumbs. */
const RESOURCE_ID_SEGMENT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const parent = i > 0 ? segments[i - 1] : undefined;
      acc += `/${segment}`;
      items.push({
        label: this.labelForSegment(segment, parent),
        path: this.breadcrumbPathForSegment(segment, parent, acc),
      });
    }

    return items;
  }

  private labelForSegment(segment: string, parent: string | undefined): string {
    if (BREADCRUMB_LABELS[segment]) {
      return BREADCRUMB_LABELS[segment];
    }
    if (this.isResourceIdSegment(segment)) {
      return (parent && BREADCRUMB_ID_PARENT_LABELS[parent]) || 'Details';
    }
    // Keep human order numbers readable (ORD-11DDC768), don't title-case them.
    if (/^ORD-/i.test(segment)) {
      return segment.toUpperCase();
    }
    return this.toTitle(segment);
  }

  /** Prefer the list route for order detail crumbs (`/orders/:id` → Orders links to `/my-orders`). */
  private breadcrumbPathForSegment(
    segment: string,
    parent: string | undefined,
    accumulatedPath: string,
  ): string {
    if (segment === 'orders' && !parent) {
      return '/my-orders';
    }
    return accumulatedPath;
  }

  private isResourceIdSegment(segment: string): boolean {
    return RESOURCE_ID_SEGMENT.test(segment);
  }

  private toTitle(value: string): string {
    return value
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
