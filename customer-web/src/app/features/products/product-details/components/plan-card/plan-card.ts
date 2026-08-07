import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { formatInr } from '../../../../../shared/utils/currency';
import { EmiPlanCard } from '../../../models/product-details.models';

@Component({
  selector: 'app-plan-card',
  templateUrl: './plan-card.html',
  styleUrl: './plan-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanCardComponent {
  readonly plan = input.required<EmiPlanCard>();
  readonly selected = input(false);
  readonly select = output<number>();

  readonly formatInr = formatInr;

  onSelect(): void {
    this.select.emit(this.plan().months);
  }
}
