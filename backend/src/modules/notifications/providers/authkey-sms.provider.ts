import { env } from '../../../config/env';
import type { OutboundMessage, SmsProvider } from './channel-provider';

function toDigits(mobile: string): string {
  return mobile.replace(/\D/g, '').slice(-10);
}

/**
 * Transactional SMS via the Authkey gateway — the same DLT infrastructure as
 * the OTP service (api.authkey.io). Notification messages need their own
 * registered DLT template; configure NOTIFY_SMS_TEMPLATE_ID (and optionally
 * NOTIFY_SMS_SENDER_ID) so the operator controls what body DLT will accept.
 */
export class AuthkeySmsProvider implements SmsProvider {
  readonly name = 'AUTHKEY_SMS';

  isConfigured(): boolean {
    return Boolean(env.AUTHKEY_API_KEY?.trim());
  }

  async sendSms(message: OutboundMessage & { toMobile: string }): Promise<void> {
    const authkey = env.AUTHKEY_API_KEY?.trim();
    if (!authkey) {
      throw new Error('AUTHKEY_API_KEY is not configured — SMS notifications disabled');
    }
    const templateId = env.NOTIFY_SMS_TEMPLATE_ID?.trim();
    if (!templateId) {
      throw new Error(
        'NOTIFY_SMS_TEMPLATE_ID is not configured — register a DLT template for notification SMS',
      );
    }

    const digits = toDigits(message.toMobile);
    if (digits.length !== 10) {
      throw new Error(`Invalid mobile number for SMS: ${message.toMobile}`);
    }

    const url = new URL('https://api.authkey.io/request');
    url.searchParams.set('authkey', authkey);
    url.searchParams.set('mobile', digits);
    url.searchParams.set('country_code', env.AUTHKEY_COUNTRY_CODE);
    url.searchParams.set(
      'sender',
      env.NOTIFY_SMS_SENDER_ID?.trim() || env.AUTHKEY_SENDER_ID,
    );
    url.searchParams.set('template_id', templateId);
    url.searchParams.set('sms', message.body.slice(0, 160));
    // {#num#} is the only DLT variable in the approved template; the message
    // body travels in the template variable to keep one registered template.
    url.searchParams.set('num', message.body.slice(0, 160));

    if (env.AUTHKEY_PE_ID) url.searchParams.set('pe_id', env.AUTHKEY_PE_ID);
    if (env.AUTHKEY_SID) url.searchParams.set('sid', env.AUTHKEY_SID);

    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: AbortSignal.timeout(8_000),
    });
    const bodyText = await response.text();

    let parsed: any = null;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      /* Authkey may return plain text */
    }

    const messageId = parsed?.MessageID ?? parsed?.messageId ?? parsed?.msgid;
    const status = String(parsed?.Status ?? parsed?.status ?? '').toLowerCase();
    const okHttp = response.ok;
    const okStatus =
      !status ||
      status === 'success' ||
      status === 'ok' ||
      status === 'submitted' ||
      status === '1';

    if (!okHttp || (!messageId && !okStatus && /error|fail|invalid/i.test(bodyText))) {
      console.error('[Authkey] notification SMS failed', {
        status: response.status,
        body: bodyText.slice(0, 500),
      });
      throw new Error('Failed to send notification SMS');
    }

    console.info('[Authkey] notification SMS accepted', {
      mobile: `******${digits.slice(-4)}`,
      status: response.status,
      messageId: messageId ?? null,
    });
  }
}
