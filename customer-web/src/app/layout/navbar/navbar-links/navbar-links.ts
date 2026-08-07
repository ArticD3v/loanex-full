import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavItem } from '../../models/layout.models';

@Component({
  selector: 'app-navbar-links',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar-links.html',
  styleUrl: './navbar-links.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarLinks {
  readonly items = input.required<NavItem[]>();
}
