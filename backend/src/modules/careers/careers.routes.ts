import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { BadRequestError } from '../../common/errors/app-error';
import { requirePermission } from '../../common/middleware/require-permission';
import { careersController } from './careers.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function handleMulterError(err: unknown, _req: Request, _res: Response, next: NextFunction) {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new BadRequestError('Resume must be 5MB or smaller.'));
    }
    return next(new BadRequestError(`Resume upload failed: ${err.message}`));
  }
  return next(err);
}

function uploadResume(req: Request, res: Response, next: NextFunction) {
  upload.single('resume')(req, res, (err: unknown) => handleMulterError(err, req, res, next));
}

/** Public customer careers routes */
export const jobsRouter = Router();
jobsRouter.get('/', careersController.listJobs);
jobsRouter.get('/:jobId', careersController.getJob);

export const jobApplicationsRouter = Router();
jobApplicationsRouter.post('/', uploadResume, careersController.submitJobApplication);

export const generalApplicationsRouter = Router();
generalApplicationsRouter.post('/', uploadResume, careersController.submitGeneralApplication);

/**
 * Admin job management routes (mounted under /api/v1/admin/jobs).
 * Parent admin router applies `authenticate`; each route requires careers.* RBAC.
 */
export const adminJobsRouter = Router();
adminJobsRouter.get('/', requirePermission('careers.view'), careersController.listJobs);
adminJobsRouter.post('/', requirePermission('careers.create'), careersController.createJob);
adminJobsRouter.patch('/:jobId', requirePermission('careers.edit'), careersController.updateJob);
adminJobsRouter.delete('/:jobId', requirePermission('careers.delete'), careersController.deleteJob);

export const careersRouter = jobsRouter;
