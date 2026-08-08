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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LayoutUiService } from '../../../../layout/services/layout-ui.service';
import { JobOpening } from '../../models/careers.models';
import { CareersService } from '../../services/careers.service';
import { isJobIdSegment, jobRoutePath } from '../../utils/job-slug';

@Component({
  selector: 'app-job-details',
  imports: [RouterLink],
  templateUrl: './job-details.html',
  styleUrl: './job-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly careers = inject(CareersService);
  private readonly layoutUi = inject(LayoutUiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly job = signal<JobOpening | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      // Reload when UUID routes are replaced with slug routes (same component instance).
      this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.loadJob();
      });
    });
  }

  retry(): void {
    this.loadJob();
  }

  jobPath(job: JobOpening): string {
    return jobRoutePath(job);
  }

  private loadJob(): void {
    const jobRef =
      this.route.snapshot.paramMap.get('jobSlug') ??
      this.route.snapshot.paramMap.get('jobId') ??
      '';
    this.loading.set(true);
    this.notFound.set(false);
    this.error.set(null);

    this.careers.getJob(jobRef).subscribe({
      next: (job) => {
        const publicSlug = jobRoutePath(job);
        // Never keep UUIDs in the address bar.
        if (isJobIdSegment(jobRef) && publicSlug !== jobRef) {
          void this.router.navigate(['/careers', publicSlug], { replaceUrl: true });
          return;
        }

        this.job.set(job);
        this.loading.set(false);
        this.layoutUi.setBreadcrumbs([
          { label: 'Home', path: '/' },
          { label: 'Careers', path: '/careers' },
          { label: job.title },
        ]);
      },
      error: (err: unknown) => {
        this.job.set(null);
        this.loading.set(false);
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status?: number }).status)
            : 0;
        if (status === 404) {
          this.notFound.set(true);
          return;
        }
        this.error.set(this.careers.error() ?? 'Unable to load job details.');
      },
    });
  }
}
