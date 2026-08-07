import { env } from '../../config/env';

const OTP_SMS_TEMPLATE =
  'Dear user, Your OTP for LoanEx verification is {#num#}. This OTP is valid for 10 minutes. Please do not share it with anyone. Regards, LOANEX INDIA PRIVATE LIMITED';

export class AuthkeySmsService {
  isConfigured(): boolean {
    return Boolean(env.AUTHKEY_API_KEY?.trim());
  }

  /**
   * Sends a registration OTP SMS via Authkey (India DLT).
   * Uses approved sender LOAINP + DLT template id; substitutes {#num#} with the OTP.
   */
  async sendOtpSms(mobile: string, otp: string): Promise<void> {
    const authkey = env.AUTHKEY_API_KEY?.trim();
    if (!authkey) {
      throw new Error('AUTHKEY_API_KEY is not configured');
    }

    const digits = mobile.replace(/\D/g, '').slice(-10);
    const sms = OTP_SMS_TEMPLATE.replace('{#num#}', otp);

    const url = new URL('https://api.authkey.io/request');
    url.searchParams.set('authkey', authkey);
    url.searchParams.set('mobile', digits);
    url.searchParams.set('country_code', env.AUTHKEY_COUNTRY_CODE);
    url.searchParams.set('sender', env.AUTHKEY_SENDER_ID);
    url.searchParams.set('template_id', env.AUTHKEY_TEMPLATE_ID);
    url.searchParams.set('sms', sms);
    // Template variable name in DLT body is {#num#}
    url.searchParams.set('num', otp);

    if (env.AUTHKEY_PE_ID) {
      url.searchParams.set('pe_id', env.AUTHKEY_PE_ID);
    }
    if (env.AUTHKEY_SID) {
      url.searchParams.set('sid', env.AUTHKEY_SID);
    }

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
      console.error('[Authkey] SMS send failed', {
        status: response.status,
        body: bodyText.slice(0, 500),
      });
      throw new Error('Failed to send OTP SMS. Please try again.');
    }

    console.info('[Authkey] OTP SMS accepted', {
      mobile: `******${digits.slice(-4)}`,
      status: response.status,
      messageId: messageId ?? null,
    });
  }
}

export const authkeySmsService = new AuthkeySmsService();
