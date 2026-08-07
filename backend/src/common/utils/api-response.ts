import { Response } from 'express';

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
  details?: unknown;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta?: Record<string, unknown>,
): Response {
  const body: ApiSuccessResponse<T> = {
    success: true,
    message,
    data,
  };

  if (meta) {
    body.meta = meta;
  }

  return res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  code = 'INTERNAL_ERROR',
  details?: unknown,
): Response {
  const body: ApiErrorResponse = {
    success: false,
    message,
    code,
  };

  if (details !== undefined) {
    body.details = details;
  }

  return res.status(statusCode).json(body);
}
