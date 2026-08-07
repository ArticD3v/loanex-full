import type {
  EmailProvider,
  OutboundMessage,
  PushProvider,
  SmsProvider,
  WhatsAppProvider,
} from './channel-provider';

/** Stub email — logs only. Swap for SendGrid/SES later. */
export class StubEmailProvider implements EmailProvider {
  readonly name = 'STUB_EMAIL';
  async sendEmail(message: OutboundMessage & { toEmail: string }): Promise<void> {
    console.info(`[Email:${this.name}] to=${message.toEmail} title="${message.title}"`);
  }
}

/** Stub SMS — logs only. Swap for Twilio/MSG91 later. */
export class StubSmsProvider implements SmsProvider {
  readonly name = 'STUB_SMS';
  async sendSms(message: OutboundMessage & { toMobile: string }): Promise<void> {
    console.info(`[SMS:${this.name}] to=${message.toMobile} body="${message.body}"`);
  }
}

/** Stub WhatsApp — future integration. */
export class StubWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'STUB_WHATSAPP';
  async sendWhatsApp(message: OutboundMessage & { toMobile: string }): Promise<void> {
    console.info(`[WhatsApp:${this.name}] to=${message.toMobile} body="${message.body}"`);
  }
}

/** Stub Push — future FCM/APNs integration. */
export class StubPushProvider implements PushProvider {
  readonly name = 'STUB_PUSH';
  async sendPush(message: OutboundMessage & { deviceToken?: string }): Promise<void> {
    console.info(
      `[Push:${this.name}] user=${message.userId} token=${message.deviceToken ?? 'n/a'} title="${message.title}"`,
    );
  }
}
