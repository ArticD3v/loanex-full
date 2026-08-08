import { Router } from 'express';
import { authenticate } from '../../../common/middleware/authenticate';
import type { AuthenticatedRequest } from '../../../common/middleware/authenticate';
import { asyncHandler } from '../../../common/utils/async-handler';
import { sendSuccess } from '../../../common/utils/api-response';
import { BadRequestError } from '../../../common/errors/app-error';
import { auditLogService } from '../service/audit-log.service';

export const auditLogRouter = Router();

auditLogRouter.use(authenticate);

/** POST /audit-log — customer/admin client audit events via API → MongoDB. */
auditLogRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const userId = (req as AuthenticatedRequest).user!.sub;
    const body = (req.body ?? {}) as {
      action?: string;
      entityType?: string;
      entity?: string;
      entityId?: string;
      changes?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    };
    const action = String(body.action ?? '').trim();
    const entity = String(body.entityType ?? body.entity ?? '').trim();
    if (!action || !entity) {
      throw new BadRequestError('action and entityType are required');
    }
    await auditLogService.log({
      userId,
      action,
      entity,
      metadata: {
        ...(body.changes ?? {}),
        ...(body.metadata ?? {}),
        ...(body.entityId ? { entityId: body.entityId } : {}),
      },
    });
    return sendSuccess(res, { logged: true }, 'Audit event recorded', 201);
  }),
);
