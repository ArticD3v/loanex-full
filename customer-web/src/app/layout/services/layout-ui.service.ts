import { computed, Injectable, signal } from '@angular/core';
import { MOCK_COUNTS } from '../data/layout-mock.data';
import { BreadcrumbItem } from '../models/layout.models';

/**
 * Layout UI state (signals only).
 * Mock counters and chrome flags — no authentication or business logic.
 */
@Injectable({ providedIn: 'root' })
export class LayoutUiService {
  readonly mobileNavOpen = signal(false);
  readonly isScrolled = signal(false);
  readonly searchQuery = signal('');

  readonly cartCount = signal<number>(MOCK_COUNTS.cart);
  readonly wishlistCount = signal<number>(MOCK_COUNTS.wishlist);

  readonly breadcrumbItems = signal<BreadcrumbItem[]>([{ label: 'Home', path: '/' }]);

  readonly showBreadcrumb = computed(() => {
    const items = this.breadcrumbItems();
    return items.length > 1 || (items.length === 1 && items[0].path !== '/');
  });

  setScrolled(value: boolean): void {
    this.isScrolled.set(value);
  }

  openMobileNav(): void {
    this.mobileNavOpen.set(true);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  toggleMobileNav(): void {
    this.mobileNavOpen.update((open) => !open);
  }

  setBreadcrumbs(items: BreadcrumbItem[]): void {
    this.breadcrumbItems.set(items);
  }

  setSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }
}
