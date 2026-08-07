import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CtaVariant } from '../../models/hero.models';

@Component({
  selector: 'app-cta-button',
  imports: [RouterLink],
  templateUrl: './cta-button.html',
  styleUrl: './cta-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.lx-cta-host--block]': 'block()',
  },
})
export class CtaButton {
  readonly label = input.required<string>();
  readonly path = input<string | null>(null);
  readonly variant = input<CtaVariant>('primary');
  readonly icon = input<string | null>(null);
  readonly block = input(false);
  readonly type = input<'button' | 'submit'>('button');
}
