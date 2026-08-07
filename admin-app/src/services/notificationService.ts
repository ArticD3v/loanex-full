import api from './api';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface CreateNotificationData {
  userId: string;
  title: string;
  message: string;
  type: string;
}

/**
 * Get ALL notifications (admin endpoint)
 */
export const getAllNotifications = async (): Promise<Notification[]> => {
  const response = await api.get('/admin/notifications');
  const data = response.data.data || [];
  return Array.isArray(data) ? data : data.items || [];
};

/**
 * Create a broadcast notification (admin endpoint)
 */
export const createNotification = async (data: CreateNotificationData): Promise<Notification> => {
  const response = await api.post('/admin/notifications', data);
  return response.data.data;
};

/**
 * Delete a notification (admin endpoint)
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
  await api.delete(`/admin/notifications/${notificationId}`);
};

/**
 * Mark a notification as read
 */
export const markNotificationRead = async (notificationId: string): Promise<void> => {
  await api.patch(`/notifications/${notificationId}/read`);
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsRead = async (): Promise<void> => {
  await api.patch('/notifications/read-all');
};
