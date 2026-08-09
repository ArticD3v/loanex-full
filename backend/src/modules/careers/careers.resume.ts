import { randomUUID } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../../config/supabase';
import { BadRequestError } from '../../common/errors/app-error';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const STORAGE_BUCKET = 'career-resumes';

export type UploadedResume = {
  resumeUrl: string;
  resumeFileName: string;
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'resume.pdf';
}

function isServerlessRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

async function ensureCareerResumesBucket(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.warn(`[Careers] listBuckets failed: ${listError.message}`);
      return false;
    }
    if (buckets?.some((b) => b.name === STORAGE_BUCKET)) return true;

    const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
      public: false,
      fileSizeLimit: MAX_RESUME_BYTES,
      allowedMimeTypes: Array.from(ALLOWED_MIME),
    });
    if (createError && !/already exists/i.test(createError.message)) {
      console.warn(`[Careers] createBucket failed: ${createError.message}`);
      return false;
    }
    // Best-effort: lock down an existing public bucket.
    try {
      await supabase.storage.updateBucket(STORAGE_BUCKET, {
        public: false,
        fileSizeLimit: MAX_RESUME_BYTES,
        allowedMimeTypes: Array.from(ALLOWED_MIME),
      });
    } catch {
      /* ignore — bucket may already exist with older API permissions */
    }
    return true;
  } catch (err) {
    console.warn('[Careers] ensureCareerResumesBucket failed.', err);
    return false;
  }
}

async function signedResumeUrl(supabase: SupabaseClient, objectPath: string): Promise<string> {
  // Long-lived signed URL for admin/recruiters; bucket itself stays private.
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(objectPath, 60 * 60 * 24 * 365);
  if (!error && data?.signedUrl) return data.signedUrl;
  return `supabase://${STORAGE_BUCKET}/${objectPath}`;
}

async function trySupabaseUpload(
  objectPath: string,
  buffer: Buffer,
  mime: string,
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null; // Supabase unconfigured — fall through to local storage.
  try {
    await ensureCareerResumesBucket(supabase);

    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(objectPath, buffer, {
      contentType: mime || 'application/octet-stream',
      upsert: false,
    });

    if (error) {
      // Retry once after ensuring bucket (race / first deploy).
      if (/bucket not found/i.test(error.message)) {
        const ready = await ensureCareerResumesBucket(supabase);
        if (ready) {
          const retry = await supabase.storage.from(STORAGE_BUCKET).upload(objectPath, buffer, {
            contentType: mime || 'application/octet-stream',
            upsert: false,
          });
          if (!retry.error) {
            return signedResumeUrl(supabase, objectPath);
          }
          console.warn(`[Careers] Supabase storage upload retry failed: ${retry.error.message}`);
          return null;
        }
      }
      console.warn(`[Careers] Supabase storage upload failed: ${error.message}`);
      return null;
    }

    return signedResumeUrl(supabase, objectPath);
  } catch (err) {
    console.warn('[Careers] Supabase storage unavailable.', err);
    return null;
  }
}

function tryLocalWrite(
  folder: string,
  objectFileName: string,
  buffer: Buffer,
): string | null {
  const candidates = [
    isServerlessRuntime()
      ? path.join(os.tmpdir(), 'career-resumes', folder)
      : path.resolve(process.cwd(), 'storage', 'career-resumes', folder),
    path.join(os.tmpdir(), 'career-resumes', folder),
  ];

  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      const absolutePath = path.join(dir, objectFileName);
      fs.writeFileSync(absolutePath, buffer);
      return absolutePath.replace(/\\/g, '/');
    } catch (err) {
      console.warn(`[Careers] Local resume write failed at ${dir}:`, err);
    }
  }

  return null;
}

export async function storeResumeFile(
  file: Express.Multer.File | undefined,
  folder: 'job-applications' | 'general-applications',
): Promise<UploadedResume> {
  if (!file?.buffer?.length) {
    throw new BadRequestError('Resume file is required.');
  }
  if (file.size > MAX_RESUME_BYTES) {
    throw new BadRequestError('Resume must be 5MB or smaller.');
  }

  const mime = String(file.mimetype || '');
  const original = sanitizeFileName(file.originalname || 'resume.pdf');
  const extOk = /\.(pdf|doc|docx)$/i.test(original);
  if (!ALLOWED_MIME.has(mime) && !extOk) {
    throw new BadRequestError('Resume must be a PDF or Word document (.pdf, .doc, .docx).');
  }

  const objectFileName = `${randomUUID()}-${original}`;
  const objectPath = `${folder}/${objectFileName}`;

  const supabaseUrl = await trySupabaseUpload(objectPath, file.buffer, mime);

  if (supabaseUrl) {
    return { resumeUrl: supabaseUrl, resumeFileName: original };
  }

  const localPath = tryLocalWrite(folder, objectFileName, file.buffer);
  if (localPath) {
    return { resumeUrl: localPath, resumeFileName: original };
  }

  // Avoid multi‑MB base64 rows when object storage is down — keep metadata so the
  // application still succeeds; ops can follow up on storage configuration.
  const inlineLimit = 200 * 1024;
  if (file.buffer.length <= inlineLimit) {
    return {
      resumeUrl: `data:${mime || 'application/octet-stream'};base64,${file.buffer.toString('base64')}`,
      resumeFileName: original,
    };
  }

  return {
    resumeUrl: `pending://${STORAGE_BUCKET}/${objectPath}`,
    resumeFileName: original,
  };
}
