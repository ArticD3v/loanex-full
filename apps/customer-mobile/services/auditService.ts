import { api } from '../lib/apiClient';

/** Audit via Backend API → MongoDB. */
export async function logAction(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  changes: any,
): Promise<void> {
  await api.post('/audit-log', {
    action,
    entityType,
    entityId,
    changes: { ...(changes || {}), requestedBy: userId },
  });
}
