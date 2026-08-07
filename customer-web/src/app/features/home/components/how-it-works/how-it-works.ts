import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { HOW_IT_WORKS_STEPS } from '../../data/home-sections-mock.data';

@Component({
  selector: 'app-how-it-works',
  templateUrl: './how-it-works.html',
  styleUrl: './how-it-works.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowItWorks {
  readonly steps = signal(HOW_IT_WORKS_STEPS);
}
