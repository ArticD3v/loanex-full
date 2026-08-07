import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LAYOUT_COMPANY, NAVBAR_NAV_ITEMS } from '../data/layout-mock.data';
import { LayoutUiService } from '../services/layout-ui.service';
import { MobileNav } from '../mobile-nav/mobile-nav';
import { NavbarActions } from './navbar-actions/navbar-actions';
import { NavbarLinks } from './navbar-links/navbar-links';
import { NavbarSearch } from './navbar-search/navbar-search';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, MobileNav, NavbarSearch, NavbarActions, NavbarLinks],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
  readonly ui = inject(LayoutUiService);
  private readonly auth = inject(AuthService);

  readonly company = LAYOUT_COMPANY;
  readonly navItems = NAVBAR_NAV_ITEMS;
  readonly showLogin = computed(() => !this.auth.isAuthenticated());
  readonly user = this.auth.user;
}
