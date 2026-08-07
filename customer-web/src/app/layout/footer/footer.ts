import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  FOOTER_SECTIONS,
  LAYOUT_COMPANY,
} from '../data/layout-mock.data';

@Component({
  selector: 'app-footer',
  imports: [FormsModule, RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  readonly company = LAYOUT_COMPANY;
  readonly sections = FOOTER_SECTIONS;
  readonly year = new Date().getFullYear();

  readonly newsletterEmail = signal('');
  readonly newsletterSubmitted = signal(false);

  onNewsletterSubmit(event: Event): void {
    event.preventDefault();
    this.newsletterSubmitted.set(true);
  }
}
