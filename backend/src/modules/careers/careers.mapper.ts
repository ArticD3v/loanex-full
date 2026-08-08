function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item)).filter(Boolean);
      }
    } catch {
      return value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function slugifyJobTitle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function resolveJobSlug(job: Record<string, any>): string {
  const existing = String(job.slug ?? '').trim();
  if (existing) return existing;
  const fromTitle = slugifyJobTitle(String(job.title ?? ''));
  return fromTitle || String(job.id ?? 'job');
}

export function serializeJob(job: Record<string, any>) {
  return {
    id: String(job.id),
    slug: resolveJobSlug(job),
    title: String(job.title ?? ''),
    department: String(job.department ?? ''),
    location: String(job.location ?? ''),
    employmentType: String(job.employmentType ?? ''),
    experience: String(job.experience ?? ''),
    shortDescription: String(job.shortDescription ?? job.short_description ?? ''),
    description: String(job.description ?? ''),
    responsibilities: asStringArray(job.responsibilities),
    requirements: asStringArray(job.requirements),
    skills: asStringArray(job.skills),
    benefits: asStringArray(job.benefits),
    status: String(job.status ?? 'inactive').toLowerCase(),
    createdAt: job.createdAt ?? job.created_at ?? null,
  };
}

export function serializeJobApplication(row: Record<string, any>) {
  return {
    id: String(row.id),
    jobId: String(row.jobId ?? row.job_id ?? ''),
    fullName: String(row.fullName ?? ''),
    email: String(row.email ?? ''),
    phone: String(row.phone ?? ''),
    location: String(row.location ?? ''),
    experience: String(row.experience ?? ''),
    currentJobTitle: String(row.currentJobTitle ?? ''),
    skills: String(row.skills ?? ''),
    resumeUrl: String(row.resumeUrl ?? ''),
    resumeFileName: String(row.resumeFileName ?? ''),
    linkedinUrl: row.linkedinUrl ?? null,
    portfolioUrl: row.portfolioUrl ?? null,
    about: String(row.about ?? ''),
    status: String(row.status ?? 'Applied'),
    submittedAt: row.createdAt ?? row.submittedAt ?? null,
  };
}

export function serializeGeneralApplication(row: Record<string, any>) {
  return {
    id: String(row.id),
    fullName: String(row.fullName ?? ''),
    email: String(row.email ?? ''),
    phone: String(row.phone ?? ''),
    location: String(row.location ?? ''),
    experience: String(row.experience ?? ''),
    currentJobTitle: String(row.currentJobTitle ?? ''),
    skills: String(row.skills ?? ''),
    preferredDepartment: String(row.preferredDepartment ?? ''),
    resumeUrl: String(row.resumeUrl ?? ''),
    resumeFileName: String(row.resumeFileName ?? ''),
    linkedinUrl: row.linkedinUrl ?? null,
    portfolioUrl: row.portfolioUrl ?? null,
    about: String(row.about ?? ''),
    status: String(row.status ?? 'Applied'),
    submittedAt: row.createdAt ?? row.submittedAt ?? null,
  };
}
