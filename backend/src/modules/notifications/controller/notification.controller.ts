import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../common/middleware/authenticate';
import { sendSuccess } from '../../../common/utils/api-response';
import { NotificationPriority, NotificationType } from '../repository/notification.repository';
import { notificationService } from '../service/notification.service';

function requireUserId(req: AuthenticatedRequest): string {
  return req.user!.sub;
}

export class NotificationController {
  list = async (req: Request, res: Response) => {
    const data = await notificationService.list(requireUserId(req as AuthenticatedRequest), {
      filter: typeof req.query.filter === 'string' ? req.query.filter : undefined,
      type: typeof req.query.type === 'string' ? req.query.type : undefined,
      unreadOnly: req.query.unreadOnly === 'true',
    });
    return sendSuccess(res, data, 'Notifications fetched');
  };

  /** POST / — customer self-create (in-app only). */
  createForSelf = async (req: Request, res: Response) => {
    const userId = requireUserId(req as AuthenticatedRequest);
    const body = req.body as {
      title?: string;
      message?: string;
      type?: string;
      route?: string;
      metadata?: Record<string, unknown>;
    };
    const data = await notificationService.createForSelf({
      userId,
      title: String(body.title ?? ''),
      message: String(body.message ?? ''),
      typeHint: body.type,
      metadata: {
        ...(body.metadata ?? {}),
        ...(body.route ? { route: body.route } : {}),
      },
    });
    return sendSuccess(res, data, 'Notification created', 201);
  };

  getById = async (req: Request, res: Response) => {
    const data = await notificationService.getById(
      String(req.params.id ?? ''),
      requireUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'Notification fetched');
  };

  markRead = async (req: Request, res: Response) => {
    const data = await notificationService.markRead(
      String(req.params.id ?? ''),
      requireUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'Notification marked as read');
  };

  markAllRead = async (req: Request, res: Response) => {
    const data = await notificationService.markAllRead(
      requireUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'All notifications marked as read');
  };

  remove = async (req: Request, res: Response) => {
    const data = await notificationService.remove(
      String(req.params.id ?? ''),
      requireUserId(req as AuthenticatedRequest),
    );
    return sendSuccess(res, data, 'Notification deleted');
  };

  listForAdmin = async (_req: Request, res: Response) => {
    const data = await notificationService.listForAdmin();
    return sendSuccess(res, data, 'Admin notifications fetched');
  };

  adminCreate = async (req: Request, res: Response) => {
    const body = req.body as {
      userId?: string;
      title?: string;
      message?: string;
      type?: NotificationType;
      priority?: NotificationPriority;
      metadata?: Record<string, unknown>;
    };
    const data = await notificationService.adminCreate({
      userId: String(body.userId ?? ''),
      title: String(body.title ?? ''),
      message: String(body.message ?? ''),
      type: body.type,
      priority: body.priority,
      metadata: body.metadata,
    });
    return sendSuccess(res, data, 'Notification created');
  };

  adminDelete = async (req: Request, res: Response) => {
    const data = await notificationService.adminDelete(String(req.params.id ?? ''));
    return sendSuccess(res, data, 'Notification deleted');
  };

  adminMarkRead = async (req: Request, res: Response) => {
    const data = await notificationService.adminMarkRead(String(req.params.id ?? ''));
    return sendSuccess(res, data, 'Notification marked as read');
  };

  adminMarkAllRead = async (_req: Request, res: Response) => {
    const data = await notificationService.adminMarkAllRead();
    return sendSuccess(res, data, 'All notifications marked as read');
  };
}

export const notificationController = new NotificationController();
