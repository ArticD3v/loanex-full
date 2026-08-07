import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { WHY_CHOOSE_CARDS } from '../../data/home-sections-mock.data';

@Component({
  selector: 'app-why-choose-us',
  templateUrl: './why-choose-us.html',
  styleUrl: './why-choose-us.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhyChooseUs {
  readonly cards = signal(WHY_CHOOSE_CARDS);
}
