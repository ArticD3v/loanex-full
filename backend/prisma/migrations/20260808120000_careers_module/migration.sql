-- Careers module: job openings + job/general applications

CREATE TABLE IF NOT EXISTS "job_openings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "employmentType" TEXT NOT NULL,
    "experience" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT NOT NULL,
    "responsibilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "requirements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "benefits" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_openings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "job_openings_status_idx" ON "job_openings"("status");
CREATE INDEX IF NOT EXISTS "job_openings_createdAt_idx" ON "job_openings"("createdAt");

CREATE TABLE IF NOT EXISTS "job_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jobId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "location" TEXT,
    "experience" TEXT,
    "currentJobTitle" TEXT,
    "skills" TEXT,
    "resumeUrl" TEXT NOT NULL,
    "resumeFileName" TEXT,
    "linkedinUrl" TEXT,
    "portfolioUrl" TEXT,
    "about" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Applied',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "job_applications_jobId_fkey"
      FOREIGN KEY ("jobId") REFERENCES "job_openings"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "job_applications_jobId_idx" ON "job_applications"("jobId");
CREATE INDEX IF NOT EXISTS "job_applications_status_idx" ON "job_applications"("status");
CREATE INDEX IF NOT EXISTS "job_applications_createdAt_idx" ON "job_applications"("createdAt");

CREATE TABLE IF NOT EXISTS "general_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "location" TEXT,
    "experience" TEXT,
    "currentJobTitle" TEXT,
    "skills" TEXT,
    "preferredDepartment" TEXT NOT NULL,
    "resumeUrl" TEXT NOT NULL,
    "resumeFileName" TEXT,
    "linkedinUrl" TEXT,
    "portfolioUrl" TEXT,
    "about" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Applied',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "general_applications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "general_applications_status_idx" ON "general_applications"("status");
CREATE INDEX IF NOT EXISTS "general_applications_createdAt_idx" ON "general_applications"("createdAt");

-- Seed a few active openings so the customer careers page is usable after migrate
INSERT INTO "job_openings" (
  "id", "title", "department", "location", "employmentType", "experience",
  "shortDescription", "description", "responsibilities", "requirements", "skills", "benefits", "status"
) VALUES
(
  'a1111111-1111-4111-8111-111111111111',
  'Frontend Developer',
  'Engineering',
  'Bengaluru / Hybrid',
  'Full-time',
  '2–4 years',
  'Build polished Angular experiences for LoanEx customer web.',
  'As a Frontend Developer at LoanEx, you will craft high-quality UI for our EMI shopping platform and partner with design and backend teams.',
  ARRAY['Develop Angular features','Ship responsive accessible UI','Collaborate on API-driven flows','Improve performance and quality'],
  ARRAY['Strong Angular and TypeScript','Solid HTML/CSS/SCSS','Familiarity with RxJS','Clear communication'],
  ARRAY['Angular','TypeScript','SCSS','RxJS','REST APIs'],
  ARRAY['Competitive compensation','Learning budget','Hybrid flexibility','Health coverage'],
  'active'
),
(
  'a2222222-2222-4222-8222-222222222222',
  'Backend Developer',
  'Engineering',
  'Bengaluru / Hybrid',
  'Full-time',
  '3–5 years',
  'Design secure APIs that power EMI, payments, and verification.',
  'Build scalable services behind LoanEx. Own APIs, data models, and integrations that keep lending and checkout reliable.',
  ARRAY['Design REST APIs','Integrate payment and KYC providers','Ensure security and observability','Partner with frontend and admin teams'],
  ARRAY['Node.js/Express experience','Strong SQL fundamentals','Auth and security awareness','Cloud debugging comfort'],
  ARRAY['Node.js','TypeScript','PostgreSQL','REST','Prisma'],
  ARRAY['Competitive compensation','Learning budget','Hybrid flexibility','Health coverage'],
  'active'
),
(
  'a3333333-3333-4333-8333-333333333333',
  'UI/UX Designer',
  'Design',
  'Bengaluru / Hybrid',
  'Full-time',
  '2–4 years',
  'Shape clear EMI shopping and onboarding experiences.',
  'Improve clarity across shopping, KYC, and EMI journeys. Turn complex finance flows into simple, confident experiences.',
  ARRAY['Own end-to-end UX for key journeys','Create wireframes and high-fidelity designs','Run usability checks','Evolve the design system'],
  ARRAY['Strong product design portfolio','Figma proficiency','Form-heavy/fintech experience a plus','Stakeholder communication'],
  ARRAY['Figma','Design Systems','Prototyping','User Research','Accessibility'],
  ARRAY['Competitive compensation','Learning budget','Hybrid flexibility','Creative toolkit support'],
  'active'
),
(
  'a4444444-4444-4444-8444-444444444444',
  'Sales Executive',
  'Growth',
  'Bengaluru / On-site',
  'Full-time',
  '1–3 years',
  'Drive merchant and customer growth for LoanEx EMI.',
  'Expand LoanEx adoption through relationship building, demos, and conversion-focused conversations.',
  ARRAY['Qualify leads','Present EMI value propositions','Manage pipeline and conversion metrics','Coordinate onboarding with product/support'],
  ARRAY['Prior sales/BD experience preferred','Strong communication','CRM comfort','Self-motivated'],
  ARRAY['Consultative Selling','CRM','Negotiation','Presentation','Pipeline Management'],
  ARRAY['Competitive base + incentives','Career growth path','Health coverage','Performance bonuses'],
  'active'
)
ON CONFLICT ("id") DO NOTHING;
