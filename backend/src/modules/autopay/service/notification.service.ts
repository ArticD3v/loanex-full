import { notifyLegacy } from '../../notifications/service/notification.service';

/**
 * Compatibility shim for AutoPay — delegates to the Notification Center.
 */
export class NotificationService {
  async notify(input: {
    userId: string;
    event: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await notifyLegacy(input);
    } catch (error) {
      console.error('[Notification] Failed to persist notification', error);
    }
  }
}

export const notificationService = new NotificationService();
