import { NextFunction, Response } from 'express';
import { ForbiddenError } from '../errors/app-error';
import { rolesService } from '../../modules/rbac/roles.service';
import type { AuthenticatedRequest } from './authenticate';

/**
 * Route guard — rejects the request unless the authenticated user's role
 * grants `permission`. Must run after `authenticate`.
 */
export function requirePermission(permission: string) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user?.sub) {
        next(new ForbiddenError('Not authorized for this action'));
        return;
      }
      const permissions = await rolesService.resolveUserPermissions(req.user.sub);
      if (!permissions.includes(permission)) {
        next(new ForbiddenError('You do not have permission to perform this action'));
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
