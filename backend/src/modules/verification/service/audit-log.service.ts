import { jsonDb } from '../../../config/json-db';

export class AuditLogService {
  async log(input: {
    userId?: string | null;
    action: string;
    entity: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      jsonDb.insert('audit_log', {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entity,
        entityId: input.userId ?? 'system',
        changes: (input.metadata ?? {}) as any,
      });
    } catch (error) {
      console.error('[AuditLog] failed to persist', error);
    }

    // Event bridge → Notification Center (skip notification lifecycle audits to avoid recursion)
    if (input.action.toUpperCase().startsWith('NOTIFICATION_')) {
      return;
    }

    void import('../../notifications/service/notification.service')
      .then(({ notificationService }) => notificationService.fromAudit(input))
      .catch((error) => console.error('[AuditLog] notification bridge failed', error));
  }
}

export const auditLogService = new AuditLogService();
