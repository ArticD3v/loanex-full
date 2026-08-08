import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JobOpening } from '../../models/careers.models';
import { jobRoutePath } from '../../utils/job-slug';

@Component({
  selector: 'app-job-card',
  imports: [RouterLink],
  templateUrl: './job-card.html',
  styleUrl: './job-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobCardComponent {
  readonly job = input.required<JobOpening>();
  readonly path = computed(() => jobRoutePath(this.job()));
}