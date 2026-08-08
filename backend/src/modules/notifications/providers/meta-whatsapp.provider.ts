import { env } from '../../../config/env';
import type { OutboundMessage, WhatsAppProvider } from './channel-provider';

function toDigits(mobile: string): string {
  return mobile.replace(/\D/g, '').slice(-10);
}

/**
 * WhatsApp via the Meta Cloud API (graph.facebook.com). Uses an approved
 * template with a single body parameter that carries the message text —
 * register a template (default name: loanex_notification) and configure
 * WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID.
 */
export class MetaWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'META_WHATSAPP';

  isConfigured(): boolean {
    return Boolean(env.WHATSAPP_ACCESS_TOKEN?.trim());
  }

  async sendWhatsApp(message: OutboundMessage & { toMobile: string }): Promise<void> {
    const token = env.WHATSAPP_ACCESS_TOKEN?.trim();
    const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID?.trim();
    if (!token || !phoneNumberId) {
      throw new Error(
        'WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID not configured — WhatsApp notifications disabled',
      );
    }

    const digits = toDigits(message.toMobile);
    if (digits.length !== 10) {
      throw new Error(`Invalid mobile number for WhatsApp: ${message.toMobile}`);
    }

    const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: `${env.AUTHKEY_COUNTRY_CODE}${digits}`,
        type: 'template',
        template: {
          name: env.WHATSAPP_TEMPLATE_NAME,
          language: { code: env.WHATSAPP_LANGUAGE_CODE },
          components: [{ type: 'body', parameters: [{ type: 'text', text: message.body.slice(0, 1000) }] }],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[WhatsApp] send failed', {
        status: response.status,
        body: errorBody.slice(0, 500),
      });
      throw new Error('Failed to send WhatsApp message');
    }

    console.info('[WhatsApp] sent', {
      to: `******${digits.slice(-4)}`,
      template: env.WHATSAPP_TEMPLATE_NAME,
    });
  }
}
