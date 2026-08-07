import { NextFunction, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import type { AuthenticatedRequest } from './authenticate';

export function optionalAuthenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    req.user = verifyAccessToken(token);
  } catch {
    // Optional auth — invalid tokens are ignored
  }

  next();
}
