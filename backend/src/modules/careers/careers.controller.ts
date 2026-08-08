import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/api-response';
import { careersService } from './careers.service';

export class CareersController {
  listJobs = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = careersService.listActiveJobs();
      return sendSuccess(res, data, 'Jobs fetched successfully');
    } catch (error) {
      return next(error);
    }
  };

  getJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = careersService.getActiveJob(String(req.params.jobId || ''));
      return sendSuccess(res, data, 'Job fetched successfully');
    } catch (error) {
      return next(error);
    }
  };

  createJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await careersService.createJob(req.body ?? {});
      return sendSuccess(res, data, 'Job created successfully', 201);
    } catch (error) {
      return next(error);
    }
  };

  updateJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await careersService.updateJob(String(req.params.jobId || ''), req.body ?? {});
      return sendSuccess(res, data, 'Job updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  deleteJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await careersService.deleteJob(String(req.params.jobId || ''));
      return sendSuccess(res, data, 'Job deactivated successfully');
    } catch (error) {
      return next(error);
    }
  };

  submitJobApplication = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await careersService.submitJobApplication(
        req.body ?? {},
        req.file as Express.Multer.File | undefined,
      );
      return sendSuccess(res, data, 'Application submitted successfully', 201);
    } catch (error) {
      return next(error);
    }
  };

  submitGeneralApplication = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await careersService.submitGeneralApplication(
        req.body ?? {},
        req.file as Express.Multer.File | undefined,
      );
      return sendSuccess(res, data, 'Profile submitted successfully', 201);
    } catch (error) {
      return next(error);
    }
  };
}

export const careersController = new CareersController();
