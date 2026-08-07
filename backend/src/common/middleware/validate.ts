import { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';
import { BadRequestError } from '../errors/app-error';

type RequestPart = 'body' | 'query' | 'params';

declare module 'express-serve-static-core' {
  interface Request {
    validatedQuery?: unknown;
    validatedParams?: unknown;
  }
}

export function validateRequest<T>(schema: ZodType<T>, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));

      next(new BadRequestError('Validation failed', details));
      return;
    }

    if (part === 'query') {
      req.validatedQuery = result.data;
    } else if (part === 'params') {
      req.validatedParams = result.data;
    } else {
      req.body = result.data;
    }
    next();
  };
}