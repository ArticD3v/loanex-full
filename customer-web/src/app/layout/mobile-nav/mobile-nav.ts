import { ChangeDetectionStrategy, Component, computed, inject, model } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';
import { AuthService } from '../../core/services/auth.service';
import { LAYOUT_COMPANY, NAVBAR_NAV_ITEMS } from '../data/layout-mock.data';
import { LayoutUiService } from '../services/layout-ui.service';

@Component({
  selector: 'app-mobile-nav',
  imports: [RouterLink, RouterLinkActive, Button, Drawer],
  templateUrl: './mobile-nav.html',
  styleUrl: './mobile-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileNav {
  readonly ui = inject(LayoutUiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Two-way bound to drawer visibility. */
  readonly visible = model(false);

  readonly company = LAYOUT_COMPANY;
  readonly navItems = NAVBAR_NAV_ITEMS;
  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly user = this.auth.user;
  readonly initials = computed(() => {
    const name = this.user()?.fullName?.trim() || 'U';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  });

  onVisibleChange(value: boolean): void {
    this.visible.set(value);
    if (!value) {
      this.ui.closeMobileNav();
    }
  }

  close(): void {
    this.visible.set(false);
    this.ui.closeMobileNav();
  }

  logout(): void {
    this.close();
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/auth/login'),
      error: () => void this.router.navigateByUrl('/auth/login'),
    });
  }
}
