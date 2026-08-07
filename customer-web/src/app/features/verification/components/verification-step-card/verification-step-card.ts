import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VerificationStepCard } from '../../models/verification.models';

@Component({
  selector: 'app-verification-step-card',
  imports: [RouterLink],
  templateUrl: './verification-step-card.html',
  styleUrl: './verification-step-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationStepCardComponent {
  readonly step = input.required<VerificationStepCard>();
}
