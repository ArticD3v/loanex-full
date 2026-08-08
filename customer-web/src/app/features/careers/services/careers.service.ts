import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccess } from '../../../core/models/auth.models';
import {
  CULTURE_HIGHLIGHTS,
  WHY_JOIN_CARDS,
} from '../data/careers-static.data';
import {
  CultureHighlight,
  GeneralApplicationResult,
  GeneralApplicationSubmitInput,
  JobApplicationResult,
  JobApplicationSubmitInput,
  JobOpening,
  WhyJoinCard,
} from '../models/careers.models';
import { withJobSlug } from '../utils/job-slug';

@Injectable({ providedIn: 'root' })
export class CareersService {
  private readonly http = inject(HttpClient);
  private readonly jobsUrl = `${environment.apiBaseUrl}/api/v1/jobs`;
  private readonly jobApplicationsUrl = `${environment.apiBaseUrl}/api/v1/job-applications`;
  private readonly generalApplicationsUrl = `${environment.apiBaseUrl}/api/v1/general-applications`;

  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  whyJoinCards(): WhyJoinCard[] {
    return WHY_JOIN_CARDS;
  }

  cultureHighlights(): CultureHighlight[] {
    return CULTURE_HIGHLIGHTS;
  }

  getJobs(): Observable<JobOpening[]> {
    return this.wrap(
      this.http.get<ApiSuccess<JobOpening[]>>(this.jobsUrl),
      'Unable to load open positions.',
    ).pipe(
      map((jobs) =>
        (jobs ?? [])
          .filter((job) => String(job.status || '').toLowerCase() === 'active')
          .map((job) => withJobSlug(job)),
      ),
    );
  }

  getJobById(jobId: string): Observable<JobOpening> {
    return this.getJob(jobId);
  }

  /**
   * Resolve a job by public slug (preferred) or UUID.
   * API supports both id and slug on GET /jobs/:jobId.
   */
  getJob(jobRef: string): Observable<JobOpening> {
    const ref = String(jobRef || '').trim();
    if (!ref) {
      this.errorSignal.set('Unable to load job details.');
      return throwError(() => new Error('Missing job reference'));
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http
      .get<ApiSuccess<JobOpening>>(`${this.jobsUrl}/${encodeURIComponent(ref)}`)
      .pipe(
        map((res) => {
          const job = withJobSlug(res.data);
          if (String(job.status || '').toLowerCase() !== 'active') {
            throw { status: 404, message: 'Job opening not found.' };
          }
          return job;
        }),
        tap(() => this.loadingSignal.set(false)),
        catchError((err: unknown) => {
          this.loadingSignal.set(false);
          this.errorSignal.set(this.extractError(err, 'Unable to load job details.'));
          return throwError(() => err);
        }),
      );
  }

  submitJobApplication(input: JobApplicationSubmitInput): Observable<JobApplicationResult> {
    const formData = new FormData();
    formData.append('jobId', input.jobId);
    formData.append('fullName', input.fullName);
    formData.append('email', input.email);
    formData.append('phone', input.phone);
    formData.append('location', input.location);
    formData.append('experience', input.experience);
    formData.append('currentJobTitle', input.currentJobTitle);
    formData.append('skills', input.skills);
    formData.append('about', input.about);
    formData.append('resume', input.resume, input.resume.name);
    if (input.linkedinUrl) formData.append('linkedinUrl', input.linkedinUrl);
    if (input.portfolioUrl) formData.append('portfolioUrl', input.portfolioUrl);

    return this.wrap(
      this.http.post<ApiSuccess<JobApplicationResult>>(this.jobApplicationsUrl, formData),
      'Unable to submit your application. Please try again.',
    );
  }

  submitGeneralApplication(
    input: GeneralApplicationSubmitInput,
  ): Observable<GeneralApplicationResult> {
    const formData = new FormData();
    formData.append('fullName', input.fullName);
    formData.append('email', input.email);
    formData.append('phone', input.phone);
    formData.append('location', input.location);
    formData.append('experience', input.experience);
    formData.append('currentJobTitle', input.currentJobTitle);
    formData.append('skills', input.skills);
    formData.append('preferredDepartment', input.preferredDepartment);
    formData.append('about', input.about);
    formData.append('resume', input.resume, input.resume.name);
    if (input.linkedinUrl) formData.append('linkedinUrl', input.linkedinUrl);
    if (input.portfolioUrl) formData.append('portfolioUrl', input.portfolioUrl);

    return this.wrap(
      this.http.post<ApiSuccess<GeneralApplicationResult>>(this.generalApplicationsUrl, formData),
      'Unable to submit your application. Please try again.',
    );
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  private wrap<T>(source: Observable<ApiSuccess<T>>, fallbackMessage: string): Observable<T> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return source.pipe(
      map((res) => res.data),
      tap(() => this.loadingSignal.set(false)),
      catchError((err: unknown) => {
        this.loadingSignal.set(false);
        this.errorSignal.set(this.extractError(err, fallbackMessage));
        return throwError(() => err);
      }),
    );
  }

  private extractError(err: unknown, fallback: string): string {
    const status =
      err && typeof err === 'object' && 'status' in err
        ? Number((err as { status?: number }).status)
        : 0;

    // Prefer a clear UI message over raw API text like "Route not found".
    if (status === 0 || status >= 500 || status === 404) {
      return fallback;
    }

    if (err && typeof err === 'object' && 'error' in err) {
      const body = (err as { error?: { message?: string } }).error;
      const message = body?.message?.trim();
      if (message && !/not found|route not found/i.test(message)) {
        return message;
      }
    }
    return fallback;
  }
}
