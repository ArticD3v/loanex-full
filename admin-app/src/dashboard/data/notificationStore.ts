import {
  getAllNotifications,
  markAllNotificationsRead as apiMarkAllRead,
  markNotificationRead as apiMarkRead,
} from '../../services/notificationService';

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type?: 'alert' | 'info' | 'success' | 'warning';
  icon: string;
}

let items: NotificationData[] = [];
let loading = false;
let loadError: unknown = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function formatTime(createdAt?: string): string {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

function iconForType(type?: string): string {
  switch (String(type || '').toUpperCase()) {
    case 'EMI_OVERDUE':
    case 'SYSTEM_ALERT':
      return 'warning-outline';
    case 'EMI_PAID':
    case 'KYC_APPROVED':
      return 'checkmark-circle-outline';
    case 'KYC_REJECTED':
      return 'close-circle-outline';
    case 'ORDER_PLACED':
      return 'cart-outline';
    case 'ORDER_SHIPPED':
      return 'cube-outline';
    case 'ORDER_DELIVERED':
      return 'checkmark-done-outline';
    default:
      return 'notifications-outline';
  }
}

function mapFromApi(raw: any): NotificationData {
  return {
    id: raw.id,
    title: raw.title || 'Notification',
    message: raw.message || '',
    time: formatTime(raw.createdAt),
    read: Boolean(raw.isRead ?? raw.read ?? false),
    type: (String(raw.type || '').toLowerCase() as NotificationData['type']) || undefined,
    icon: iconForType(raw.type),
  };
}

function refresh() {
  notify();
}

export function getNotifications(): NotificationData[] {
  return items;
}

export function getUnreadCount(): number {
  return items.filter((n) => !n.read).length;
}

export function subscribeNotifications(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Load notifications from the backend API. Called on screen focus.
 */
export async function loadNotifications(): Promise<void> {
  if (loading) return;
  loading = true;
  try {
    const list = await getAllNotifications();
    items = list.map(mapFromApi);
    loadError = null;
  } catch (error) {
    console.warn('[notificationStore] Failed to load notifications:', error);
    loadError = error;
  } finally {
    loading = false;
    refresh();
  }
}

export function markNotificationRead(id: string): void {
  let changed = false;
  items = items.map((n) => {
    if (n.id !== id || n.read) return n;
    changed = true;
    return { ...n, read: true };
  });
  if (changed) {
    notify();
    apiMarkRead(id).catch((error) =>
      console.warn('[notificationStore] Failed to mark notification read:', error),
    );
  }
}

export function markAllNotificationsRead(): void {
  if (!items.some((n) => !n.read)) return;
  items = items.map((n) => (n.read ? n : { ...n, read: true }));
  notify();
  apiMarkAllRead().catch((error) =>
    console.warn('[notificationStore] Failed to mark all notifications read:', error),
  );
}
