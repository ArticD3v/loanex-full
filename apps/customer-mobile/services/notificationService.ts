import { api } from '../lib/apiClient';
import { AppNotification, NotificationType } from '../types';

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  route?: string;
}

function mapTypeToUi(type: string | undefined): NotificationType {
  const t = String(type || 'general').toUpperCase();
  if (t.includes('KYC')) return 'kyc';
  if (t.includes('ORDER')) return 'order';
  if (t.includes('EMI') || t.includes('LOAN') || t.includes('AUTOPAY')) return 'emi';
  if (t.includes('PAYMENT') || t.includes('DOWN_PAYMENT')) return 'payment';
  return 'general';
}

function mapNotification(data: any): AppNotification {
  const meta = data.metadata || {};
  return {
    id: data.id,
    userId: data.userId || data.user_id,
    title: data.title,
    message: data.message || data.description || '',
    type: mapTypeToUi(data.type),
    read: Boolean(data.isRead ?? data.read),
    route: meta.route || data.route || '',
    createdAt: data.createdAt || data.created_at,
  };
}

/** Notifications via Backend API → MongoDB. */
export async function getNotifications(_userId: string): Promise<AppNotification[]> {
  try {
    const res = await api.get('/notifications');
    const items = res.data?.items || res.data?.notifications || res.data || [];
    return (Array.isArray(items) ? items : []).map(mapNotification);
  } catch (err: any) {
    console.warn('[Notifications] get failed:', err?.message || err);
    return [];
  }
}

export async function getUnreadCount(_userId: string): Promise<number> {
  try {
    const res = await api.get('/notifications?filter=UNREAD');
    if (typeof res.data?.unreadCount === 'number') return res.data.unreadCount;
    const items = res.data?.items || res.data || [];
    return Array.isArray(items) ? items.length : 0;
  } catch {
    return 0;
  }
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  if (!input.userId || input.userId.startsWith('fallback-')) return;
  try {
    await api.post('/notifications', {
      title: input.title,
      message: input.message || '',
      type: input.type || 'general',
      route: input.route || '',
    });
  } catch (err: any) {
    console.warn('[Notifications] create failed:', err?.message || err);
  }
}

export async function markAsRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllAsRead(_userId: string): Promise<void> {
  await api.patch('/notifications/read-all');
}
