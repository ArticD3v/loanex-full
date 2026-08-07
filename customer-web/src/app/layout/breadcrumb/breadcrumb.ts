import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbItem } from '../models/layout.models';

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Breadcrumb {
  /** Breadcrumb trail. Last item is the current page (non-link). */
  readonly items = input.required<BreadcrumbItem[]>();

  /**
   * Angular RouterLink does not parse `?query` inside path strings.
   * Split them so category links like `/products?category=X` work.
   */
  linkPath(item: BreadcrumbItem): string {
    const path = item.path?.trim();
    if (!path) return '/';
    return path.split('?')[0] || '/';
  }

  linkQueryParams(item: BreadcrumbItem): Record<string, string> {
    const path = item.path?.trim();
    if (!path || !path.includes('?')) return {};
    const query = path.slice(path.indexOf('?') + 1);
    return Object.fromEntries(new URLSearchParams(query).entries());
  }
}
