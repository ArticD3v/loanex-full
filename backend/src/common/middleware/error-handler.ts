import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error';
import { sendError } from '../utils/api-response';
import { env } from '../../config/env';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError('Route not found', 404, 'NOT_FOUND'));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.code, err.details);
    return;
  }

  if (err instanceof ZodError) {
    sendError(
      res,
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    );
    return;
  }

  console.error('[UnhandledError]', err);

  sendError(
    res,
    env.NODE_ENV === 'production' ? 'Internal server error' : String(err),
    500,
    'INTERNAL_ERROR',
  );
}
