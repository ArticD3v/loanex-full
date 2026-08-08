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
import { ApplicationFormComponent } from '../../components/application-form/application-form';
import { JobOpening } from '../../models/careers.models';
import { CareersService } from '../../services/careers.service';
import { isJobIdSegment, jobRoutePath } from '../../utils/job-slug';

@Component({
  selector: 'app-job-apply',
  imports: [RouterLink, ApplicationFormComponent],
  templateUrl: './job-apply.html',
  styleUrl: './job-apply.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobApplyComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly careers = inject(CareersService);
  private readonly layoutUi = inject(LayoutUiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly job = signal<JobOpening | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly applicationId = signal<string | null>(null);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }

      this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.loadJob();
      });
    });
  }

  jobPath(job: JobOpening): string {
    return jobRoutePath(job);
  }

  onSubmitted(id: string): void {
    this.applicationId.set(id);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private loadJob(): void {
    const jobRef =
      this.route.snapshot.paramMap.get('jobSlug') ??
      this.route.snapshot.paramMap.get('jobId') ??
      '';

    this.loading.set(true);
    this.notFound.set(false);
    this.applicationId.set(null);

    this.careers.getJob(jobRef).subscribe({
      next: (job) => {
        const publicSlug = jobRoutePath(job);
        if (isJobIdSegment(jobRef) && publicSlug !== jobRef) {
          void this.router.navigate(['/careers', publicSlug, 'apply'], {
            replaceUrl: true,
          });
          return;
        }

        this.loading.set(false);
        this.job.set(job);
        this.layoutUi.setBreadcrumbs([
          { label: 'Home', path: '/' },
          { label: 'Careers', path: '/careers' },
          { label: job.title, path: `/careers/${publicSlug}` },
          { label: 'Apply' },
        ]);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.job.set(null);
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status?: number }).status)
            : 0;
        this.notFound.set(status === 404 || status === 0);
      },
    });
  }
}
