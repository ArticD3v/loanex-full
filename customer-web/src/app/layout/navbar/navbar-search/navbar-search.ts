import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LayoutUiService } from '../../services/layout-ui.service';

@Component({
  selector: 'app-navbar-search',
  imports: [FormsModule],
  templateUrl: './navbar-search.html',
  styleUrl: './navbar-search.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarSearch {
  private readonly router = inject(Router);
  private readonly layoutUi = inject(LayoutUiService);

  readonly query = input<string>('');
  readonly queryChange = output<string>();

  onSubmit(event: Event): void {
    event.preventDefault();
    const q = this.query().trim();
    if (q) {
      this.layoutUi.setSearchQuery(q);
    }
    void this.router.navigate(['/products'], {
      queryParams: q ? { q } : {},
    });
  }
}
