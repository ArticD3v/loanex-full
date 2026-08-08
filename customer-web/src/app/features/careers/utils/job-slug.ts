import { JobOpening } from '../models/careers.models';

const UUID_SEGMENT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Build a URL-safe slug from a job title. */
export function slugifyJobTitle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function isJobIdSegment(value: string): boolean {
  return UUID_SEGMENT.test(value.trim());
}

/** Prefer API slug; otherwise derive from title so routes never need UUIDs. */
export function resolveJobSlug(job: Pick<JobOpening, 'id' | 'title'> & { slug?: string | null }): string {
  const fromApi = String(job.slug ?? '').trim();
  if (fromApi && !isJobIdSegment(fromApi)) {
    return fromApi;
  }
  return slugifyJobTitle(job.title) || job.id;
}

export function withJobSlug(job: JobOpening): JobOpening {
  return {
    ...job,
    slug: resolveJobSlug(job),
  };
}

export function jobRoutePath(job: Pick<JobOpening, 'id' | 'title'> & { slug?: string | null }): string {
  return resolveJobSlug(job);
}
