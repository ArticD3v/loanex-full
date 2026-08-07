import type { NotificationPriority, NotificationType } from '@prisma/client';

export type OutboundMessage = {
  userId: string;
  to?: string;
  title: string;
  body: string;
  type: NotificationType;
  priority: NotificationPriority;
  metadata?: Record<string, unknown>;
};

export interface EmailProvider {
  readonly name: string;
  sendEmail(message: OutboundMessage & { toEmail: string }): Promise<void>;
}

export interface SmsProvider {
  readonly name: string;
  sendSms(message: OutboundMessage & { toMobile: string }): Promise<void>;
}

export interface WhatsAppProvider {
  readonly name: string;
  sendWhatsApp(message: OutboundMessage & { toMobile: string }): Promise<void>;
}

export interface PushProvider {
  readonly name: string;
  sendPush(message: OutboundMessage & { deviceToken?: string }): Promise<void>;
}
