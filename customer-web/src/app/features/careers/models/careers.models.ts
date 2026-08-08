/** Application lifecycle statuses (admin integration later). */
export type ApplicationStatus =
  | 'Applied'
  | 'Under Review'
  | 'Shortlisted'
  | 'Interview'
  | 'Selected'
  | 'Rejected';

export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | string;

export type JobStatus = 'active' | 'inactive' | string;

export interface JobOpening {
  id: string;
  /** URL-safe public identifier (preferred in routes). Always set in the UI layer. */
  slug?: string;
  title: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  experience: string;
  shortDescription: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  skills: string[];
  benefits: string[];
  status: JobStatus;
  createdAt: string | null;
}

export interface WhyJoinCard {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface CultureHighlight {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export type PreferredDepartment =
  | 'Engineering'
  | 'Design'
  | 'Sales'
  | 'Marketing'
  | 'Operations'
  | 'Finance'
  | 'Other';

export const PREFERRED_DEPARTMENTS: PreferredDepartment[] = [
  'Engineering',
  'Design',
  'Sales',
  'Marketing',
  'Operations',
  'Finance',
  'Other',
];

/** Job-specific application submit fields (sent as multipart/form-data). */
export interface JobApplicationSubmitInput {
  jobId: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  experience: string;
  currentJobTitle: string;
  skills: string;
  resume: File;
  linkedinUrl?: string;
  portfolioUrl?: string;
  about: string;
}

export interface JobApplicationResult {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  submittedAt: string | null;
  message: string;
}

/** General talent-pool application (no jobId). */
export interface GeneralApplicationSubmitInput {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  experience: string;
  currentJobTitle: string;
  skills: string;
  preferredDepartment: PreferredDepartment;
  resume: File;
  linkedinUrl?: string;
  portfolioUrl?: string;
  about: string;
}

export interface GeneralApplicationResult {
  id: string;
  status: ApplicationStatus;
  submittedAt: string | null;
  message: string;
}
