import { BadRequestError, NotFoundError } from '../../common/errors/app-error';
import { jsonDb } from '../../config/json-db';
import {
  resolveJobSlug,
  serializeGeneralApplication,
  serializeJob,
  serializeJobApplication,
  slugifyJobTitle,
} from './careers.mapper';
import { storeResumeFile } from './careers.resume';

const JOBS = 'job_openings';
const JOB_APPS = 'job_applications';
const GENERAL_APPS = 'general_applications';

function parseListField(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    /* fall through */
  }
  return value
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function uniqueJobSlug(base: string, excludeId?: string): string {
  const root = slugifyJobTitle(base) || 'job';
  let candidate = root;
  let n = 2;
  const jobs = jsonDb.findMany(JOBS);
  while (
    jobs.some(
      (job: any) =>
        resolveJobSlug(job) === candidate && (!excludeId || String(job.id) !== excludeId),
    )
  ) {
    candidate = `${root}-${n++}`;
  }
  return candidate;
}

function findJobByRef(ref: string) {
  const key = String(ref || '').trim();
  if (!key) return null;
  const byId = jsonDb.findOne(JOBS, { id: key });
  if (byId) return byId;
  const jobs = jsonDb.findMany(JOBS);
  return (
    jobs.find((job: any) => resolveJobSlug(job).toLowerCase() === key.toLowerCase()) ?? null
  );
}

export class CareersService {
  listActiveJobs() {
    const jobs = jsonDb
      .findMany(JOBS)
      .filter((job: any) => String(job.status || '').toLowerCase() === 'active')
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      )
      .map((job: any) => serializeJob(job));
    return jobs;
  }

  getActiveJobById(jobId: string) {
    return this.getActiveJob(jobId);
  }

  /** Resolve a public job by slug (preferred) or id (legacy links). */
  getActiveJob(jobRef: string) {
    const job = findJobByRef(jobRef);
    if (!job || String(job.status || '').toLowerCase() !== 'active') {
      throw new NotFoundError('Job opening not found.');
    }
    return serializeJob(job);
  }

  async createJob(body: Record<string, any>) {
    const title = String(body.title || '').trim();
    const department = String(body.department || '').trim();
    const location = String(body.location || '').trim();
    const employmentType = String(body.employmentType || '').trim();
    const experience = String(body.experience || '').trim();
    const description = String(body.description || '').trim();

    if (!title || !department || !location || !employmentType || !experience || !description) {
      throw new BadRequestError('Missing required job fields.');
    }

    const slug = uniqueJobSlug(String(body.slug || title));

    const created = await jsonDb.insertAwaited(JOBS, {
      title,
      slug,
      department,
      location,
      employmentType,
      experience,
      shortDescription: String(body.shortDescription || '').trim(),
      description,
      responsibilities: parseListField(body.responsibilities),
      requirements: parseListField(body.requirements),
      skills: parseListField(body.skills),
      benefits: parseListField(body.benefits),
      status: String(body.status || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active',
    });

    return serializeJob(created);
  }

  async updateJob(jobId: string, body: Record<string, any>) {
    const existing = findJobByRef(jobId) ?? jsonDb.findOne(JOBS, { id: jobId });
    if (!existing) throw new NotFoundError('Job opening not found.');

    const patch: Record<string, unknown> = {};
    for (const key of [
      'title',
      'department',
      'location',
      'employmentType',
      'experience',
      'shortDescription',
      'description',
      'status',
    ] as const) {
      if (body[key] !== undefined) patch[key] = String(body[key]).trim();
    }
    for (const key of ['responsibilities', 'requirements', 'skills', 'benefits'] as const) {
      if (body[key] !== undefined) patch[key] = parseListField(body[key]);
    }
    if (body.slug !== undefined) {
      patch.slug = uniqueJobSlug(String(body.slug || existing.title), String(existing.id));
    } else if (!existing.slug) {
      patch.slug = uniqueJobSlug(String(patch.title ?? existing.title), String(existing.id));
    }
    if (patch.status) {
      patch.status = String(patch.status).toLowerCase() === 'inactive' ? 'inactive' : 'active';
    }

    const updated = await jsonDb.updateAwaited(JOBS, { id: existing.id }, patch);
    return serializeJob(updated);
  }

  async deleteJob(jobId: string) {
    const existing = jsonDb.findOne(JOBS, { id: jobId });
    if (!existing) throw new NotFoundError('Job opening not found.');
    await jsonDb.updateAwaited(JOBS, { id: jobId }, { status: 'inactive' });
    return { id: jobId, status: 'inactive' };
  }

  async submitJobApplication(body: Record<string, any>, file?: Express.Multer.File) {
    const jobId = String(body.jobId || '').trim();
    if (!jobId) throw new BadRequestError('jobId is required.');

    const job = jsonDb.findOne(JOBS, { id: jobId });
    if (!job || String(job.status || '').toLowerCase() !== 'active') {
      throw new BadRequestError('This job opening is not accepting applications.');
    }

    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim();
    const phone = String(body.phone || '').trim();
    const about = String(body.about || body.coverLetter || '').trim();

    if (!fullName || !email || !phone || !about) {
      throw new BadRequestError('fullName, email, phone, and about are required.');
    }

    const resume = await storeResumeFile(file, 'job-applications');
    const created = await jsonDb.insertAwaited(JOB_APPS, {
      jobId,
      fullName,
      email,
      phone,
      location: String(body.location || body.currentLocation || '').trim(),
      experience: String(body.experience || '').trim(),
      currentJobTitle: String(body.currentJobTitle || '').trim(),
      skills: String(body.skills || '').trim(),
      resumeUrl: resume.resumeUrl,
      resumeFileName: resume.resumeFileName,
      linkedinUrl: String(body.linkedinUrl || body.linkedInUrl || '').trim() || null,
      portfolioUrl: String(body.portfolioUrl || '').trim() || null,
      about,
      status: 'Applied',
    });

    return {
      ...serializeJobApplication(created),
      message:
        'Thank you for applying. Our team will review your profile and contact you if there is a suitable opportunity.',
    };
  }

  async submitGeneralApplication(body: Record<string, any>, file?: Express.Multer.File) {
    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim();
    const phone = String(body.phone || '').trim();
    const preferredDepartment = String(body.preferredDepartment || '').trim();
    const about = String(body.about || '').trim();

    if (!fullName || !email || !phone || !preferredDepartment || !about) {
      throw new BadRequestError(
        'fullName, email, phone, preferredDepartment, and about are required.',
      );
    }

    const resume = await storeResumeFile(file, 'general-applications');
    const created = await jsonDb.insertAwaited(GENERAL_APPS, {
      fullName,
      email,
      phone,
      location: String(body.location || '').trim(),
      experience: String(body.experience || '').trim(),
      currentJobTitle: String(body.currentJobTitle || '').trim(),
      skills: String(body.skills || '').trim(),
      preferredDepartment,
      resumeUrl: resume.resumeUrl,
      resumeFileName: resume.resumeFileName,
      linkedinUrl: String(body.linkedinUrl || body.linkedInUrl || '').trim() || null,
      portfolioUrl: String(body.portfolioUrl || '').trim() || null,
      about,
      status: 'Applied',
    });

    return {
      ...serializeGeneralApplication(created),
      message:
        'Thank you for applying. Our team will review your profile and contact you if there is a suitable opportunity.',
    };
  }
}

export const careersService = new CareersService();
