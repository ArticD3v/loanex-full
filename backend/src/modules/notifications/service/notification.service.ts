import {
  NotificationCategory,
  NotificationPriority,
  NotificationType,
} from '../repository/notification.repository';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors/app-error';
import { jsonDb } from '../../../config/json-db';
import { auditLogService } from '../../verification/service/audit-log.service';
import {
  getEmailProvider,
  getPushProvider,
  getSmsProvider,
  getWhatsAppProvider,
} from '../providers/provider.factory';
import { notificationRepository } from '../repository/notification.repository';
import {
  categoryForType,
  defaultPriority,
  mapAuditActionToNotification,
} from './notification-mapper';

function mapNotification(row: {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  isRead: boolean;
  readAt: Date | null;
  metadata: unknown;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    message: row.message,
    description: row.message,
    type: row.type,
    category: row.category,
    priority: row.priority,
    isRead: row.isRead,
    readStatus: row.isRead ? 'READ' : 'UNREAD',
    readAt: row.readAt,
    metadata: row.metadata,
    archived: row.archived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class NotificationService {
  async dispatch(input: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    priority?: NotificationPriority;
    metadata?: Record<string, unknown>;
    channels?: Array<'inapp' | 'email' | 'sms' | 'whatsapp' | 'push'>;
  }) {
    const category = categoryForType(input.type);
    const priority = input.priority ?? defaultPriority(input.type);
    // Default covers all outbound channels so transactional notifications
    // (order events, autopay, reminders) are actually delivered once the
    // real providers are configured. Callers can pass explicit channels to
    // restrict (e.g. adminCreate stays inapp+email).
    const channels = input.channels ?? ['inapp', 'email', 'sms', 'whatsapp'];

    const created = await notificationRepository.create({
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      category,
      priority,
      metadata: input.metadata,
    });

    await auditLogService.log({
      userId: input.userId,
      action: 'NOTIFICATION_SENT',
      entity: 'notifications',
      metadata: {
        notificationId: created.id,
        type: input.type,
        channels,
        timestamp: new Date().toISOString(),
      },
    });

    const user = jsonDb.findOne('users', { id: input.userId });
    // User rows store the mobile under `phone` (e.g. createUser inserts
    // phone: mobile) — fall back to `mobile` for legacy rows.
    const mobile = user?.phone ?? user?.mobile;

    const outbound = {
      userId: input.userId,
      title: input.title,
      body: input.message,
      type: input.type,
      priority,
      metadata: input.metadata,
    };

    const results = await Promise.allSettled([
      channels.includes('email') && user?.email
        ? getEmailProvider().sendEmail({ ...outbound, toEmail: user.email })
        : Promise.resolve(),
      channels.includes('sms') && mobile
        ? getSmsProvider().sendSms({ ...outbound, toMobile: mobile })
        : Promise.resolve(),
      channels.includes('whatsapp') && mobile
        ? getWhatsAppProvider().sendWhatsApp({ ...outbound, toMobile: mobile })
        : Promise.resolve(),
      channels.includes('push')
        ? getPushProvider().sendPush(outbound)
        : Promise.resolve(),
    ]);

    // Delivery failures must be visible even though the in-app notification
    // (and the audit entry) already succeeded.
    const channelsList = ['email', 'sms', 'whatsapp', 'push'];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `[Notification] ${channelsList[index]} delivery failed`,
          result.reason instanceof Error ? result.reason.message : result.reason,
        );
      }
    });

    return mapNotification(created);
  }

  /** Bridge from audit logs — called via dynamic import to avoid circular deps. */
  async fromAudit(input: {
    userId?: string | null;
    action: string;
    entity: string;
    metadata?: Record<string, unknown>;
  }) {
    if (!input.userId) return null;
    const mapped = mapAuditActionToNotification(input.action, input.metadata);
    if (!mapped) return null;

    return this.dispatch({
      userId: input.userId,
      type: mapped.type,
      title: mapped.title,
      message: mapped.message,
      priority: mapped.priority,
      metadata: {
        ...(input.metadata ?? {}),
        sourceAction: input.action,
        sourceEntity: input.entity,
      },
    });
  }

  async list(
    userId: string,
    query: { filter?: string; type?: string; unreadOnly?: boolean },
  ) {
    const filter = (query.filter ?? 'ALL').toUpperCase();
    let category: NotificationCategory | undefined;
    if (filter === 'LOAN') category = NotificationCategory.LOAN;
    if (filter === 'ORDERS') category = NotificationCategory.ORDERS;
    if (filter === 'PAYMENTS') category = NotificationCategory.PAYMENTS;
    if (filter === 'OFFERS') category = NotificationCategory.OFFERS;
    if (filter === 'SYSTEM') category = NotificationCategory.SYSTEM;

    const type =
      query.type && Object.values(NotificationType).includes(query.type as NotificationType)
        ? (query.type as NotificationType)
        : undefined;

    const items = await notificationRepository.list({
      userId,
      category,
      type,
      unreadOnly: filter === 'UNREAD' || query.unreadOnly === true,
    });
    const unreadCount = await notificationRepository.countUnread(userId);

    return {
      unreadCount,
      total: items.length,
      items: items.map(mapNotification),
    };
  }

  async getById(id: string, userId: string) {
    const row = await notificationRepository.findByIdForUser(id, userId);
    if (!row) throw new NotFoundError('Notification not found.');
    return mapNotification(row);
  }

  async markRead(id: string, userId: string) {
    const existing = await notificationRepository.findByIdForUser(id, userId);
    if (!existing) throw new NotFoundError('Notification not found.');

    await notificationRepository.markRead(id, userId);
    await auditLogService.log({
      userId,
      action: 'NOTIFICATION_READ',
      entity: 'notifications',
      metadata: { notificationId: id, timestamp: new Date().toISOString() },
    });

    const refreshed = await notificationRepository.findByIdForUser(id, userId);
    return mapNotification(refreshed!);
  }

  async markAllRead(userId: string) {
    const result = await notificationRepository.markAllRead(userId);
    await auditLogService.log({
      userId,
      action: 'NOTIFICATION_READ',
      entity: 'notifications',
      metadata: { all: true, count: result.count, timestamp: new Date().toISOString() },
    });
    return { updated: result.count };
  }

  async remove(id: string, userId: string) {
    const existing = await notificationRepository.findByIdForUser(id, userId);
    if (!existing) throw new NotFoundError('Notification not found.');

    await notificationRepository.softDelete(id, userId);
    await auditLogService.log({
      userId,
      action: 'NOTIFICATION_DELETED',
      entity: 'notifications',
      metadata: { notificationId: id, timestamp: new Date().toISOString() },
    });
    return { deleted: true };
  }

  async listForAdmin() {
    const items = await notificationRepository.listForAdmin();
    return {
      total: items.length,
      items: items.map((row) => {
        const user = jsonDb.findOne('users', { id: row.userId });
        return {
          ...mapNotification(row),
          customer: user
            ? {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                mobile: user.mobile,
              }
            : null,
        };
      }),
    };
  }

  async createForSelf(input: {
    userId: string;
    title: string;
    message: string;
    typeHint?: string;
    metadata?: Record<string, unknown>;
  }) {
    if (!input.title.trim()) {
      throw new BadRequestError('Notification title is required.');
    }
    const hint = String(input.typeHint ?? 'general').toLowerCase();
    let type = NotificationType.SYSTEM;
    if (hint === 'kyc') type = NotificationType.KYC_APPROVED;
    else if (hint === 'order') type = NotificationType.ORDER_CONFIRMED;
    else if (hint === 'emi') type = NotificationType.EMI_DUE_REMINDER;
    else if (hint === 'payment') type = NotificationType.DOWN_PAYMENT_SUCCESS;

    return this.dispatch({
      userId: input.userId,
      type,
      title: input.title,
      message: input.message,
      metadata: input.metadata,
      channels: ['inapp'],
    });
  }

  async adminCreate(input: {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    priority?: NotificationPriority;
    metadata?: Record<string, unknown>;
  }) {
    const user = jsonDb.findOne('users', { id: input.userId });
    if (!user) throw new NotFoundError('User not found.');

    return this.dispatch({
      userId: input.userId,
      type: input.type ?? NotificationType.SYSTEM,
      title: input.title,
      message: input.message,
      priority: input.priority,
      metadata: input.metadata,
      channels: ['inapp', 'email'],
    });
  }

  async adminDelete(id: string) {
    const existing = await notificationRepository.findById(id);
    if (!existing) throw new NotFoundError('Notification not found.');
    await notificationRepository.hardDelete(id);
    await auditLogService.log({
      userId: existing.userId,
      action: 'NOTIFICATION_DELETED',
      entity: 'notifications',
      metadata: { notificationId: id, by: 'admin', timestamp: new Date().toISOString() },
    });
    return { deleted: true };
  }

  async adminMarkRead(id: string) {
    const existing = await notificationRepository.findById(id);
    if (!existing) throw new NotFoundError('Notification not found.');
    await notificationRepository.markRead(id, existing.userId);
    return mapNotification(await notificationRepository.findById(id));
  }

  async adminMarkAllRead() {
    const result = await notificationRepository.adminMarkAllRead();
    return { updated: result.count };
  }

  assertOwner(userId: string, ownerId: string) {
    if (userId !== ownerId) throw new ForbiddenError('You can only access your own notifications.');
  }
}

export const notificationService = new NotificationService();

/** Compatibility shim used by AutoPay module. */
export async function notifyLegacy(input: {
  userId: string;
  event: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const mapped = mapAuditActionToNotification(input.event, input.metadata);
  return notificationService.dispatch({
    userId: input.userId,
    type: mapped?.type ?? NotificationType.SYSTEM,
    title: input.title,
    message: input.message,
    priority: mapped?.priority,
    metadata: { ...(input.metadata ?? {}), legacyEvent: input.event },
  });
}
