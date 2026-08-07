import { NotificationPriority, NotificationType } from '@prisma/client';

export type CreateNotificationDto = {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown>;
};

export type NotificationListQueryDto = {
  filter?: string;
  type?: string;
  unreadOnly?: boolean;
};

export type AdminCreateNotificationDto = {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown>;
};
