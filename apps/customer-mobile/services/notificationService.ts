import { supabase } from '../lib/supabase';
import { AppNotification, NotificationType } from '../types';

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  route?: string;
}

function mapNotification(data: any): AppNotification {
  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    message: data.message || '',
    type: data.type,
    read: data.read,
    route: data.route || '',
    createdAt: data.created_at,
  };
}

/** Get all notifications for a user, newest first */
export async function getNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.warn('[Notifications] get failed:', error.message);
    return [];
  }
  return (data || []).map(mapNotification);
}

/** Count unread notifications for a user */
export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) return 0;
  return count || 0;
}

/** Create a notification for a user (fires on real activity) */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  if (!input.userId || input.userId.startsWith('fallback-')) return;

  const { error } = await supabase.from('notifications').insert({
    user_id: input.userId,
    title: input.title,
    message: input.message || '',
    type: input.type || 'general',
    read: false,
    route: input.route || '',
  });

  if (error) {
    console.warn('[Notifications] create failed:', error.message);
  }
}

/** Mark a single notification as read */
export async function markAsRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('id', id);
}

/** Mark all notifications for a user as read */
export async function markAllAsRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
}
