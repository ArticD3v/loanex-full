import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { JobCardComponent } from '../../components/job-card/job-card';
import {
  CultureHighlight,
  JobOpening,
  WhyJoinCard,
} from '../../models/careers.models';
import { CareersService } from '../../services/careers.service';

@Component({
  selector: 'app-careers-page',
  imports: [RouterLink, JobCardComponent],
  templateUrl: './careers-page.html',
  styleUrl: './careers-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CareersPageComponent {
  private readonly careers = inject(CareersService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly whyJoin = signal<WhyJoinCard[]>([]);
  readonly culture = signal<CultureHighlight[]>([]);
  readonly jobs = signal<JobOpening[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.whyJoin.set(this.careers.whyJoinCards());
    this.culture.set(this.careers.cultureHighlights());

    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      this.loadJobs();
    });
  }

  retry(): void {
    this.loadJobs();
  }

  private loadJobs(): void {
    this.loading.set(true);
    this.error.set(null);

    this.careers
      .getJobs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (jobs) => {
          this.jobs.set(jobs);
          this.loading.set(false);
        },
        error: () => {
          this.jobs.set([]);
          this.error.set(this.careers.error() ?? 'Unable to load open positions.');
          this.loading.set(false);
        },
      });
  }
}
