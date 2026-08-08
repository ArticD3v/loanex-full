import { env } from '../../../config/env';
import type {
  EmailProvider,
  PushProvider,
  SmsProvider,
  WhatsAppProvider,
} from './channel-provider';
import { AuthkeySmsProvider } from './authkey-sms.provider';
import { MetaWhatsAppProvider } from './meta-whatsapp.provider';
import { SmtpEmailProvider } from './smtp-email.provider';
import {
  StubEmailProvider,
  StubPushProvider,
  StubSmsProvider,
  StubWhatsAppProvider,
} from './stub.providers';

function resolveEmailProvider(): EmailProvider {
  return env.SMTP_HOST?.trim() ? new SmtpEmailProvider() : new StubEmailProvider();
}

function resolveSmsProvider(): SmsProvider {
  return env.AUTHKEY_API_KEY?.trim() ? new AuthkeySmsProvider() : new StubSmsProvider();
}

function resolveWhatsAppProvider(): WhatsAppProvider {
  return env.WHATSAPP_ACCESS_TOKEN?.trim()
    ? new MetaWhatsAppProvider()
    : new StubWhatsAppProvider();
}

function resolvePushProvider(): PushProvider {
  // Push (FCM/APNs) is not wired yet — keep the stub so dispatch is a no-op.
  return new StubPushProvider();
}

let emailProvider: EmailProvider = resolveEmailProvider();
let smsProvider: SmsProvider = resolveSmsProvider();
let whatsappProvider: WhatsAppProvider = resolveWhatsAppProvider();
let pushProvider: PushProvider = resolvePushProvider();

export function getEmailProvider(): EmailProvider {
  return emailProvider;
}
export function getSmsProvider(): SmsProvider {
  return smsProvider;
}
export function getWhatsAppProvider(): WhatsAppProvider {
  return whatsappProvider;
}
export function getPushProvider(): PushProvider {
  return pushProvider;
}

/** Test/integration helpers to swap providers without changing business logic. */
export function setEmailProvider(provider: EmailProvider): void {
  emailProvider = provider;
}
export function setSmsProvider(provider: SmsProvider): void {
  smsProvider = provider;
}
export function setWhatsAppProvider(provider: WhatsAppProvider): void {
  whatsappProvider = provider;
}
export function setPushProvider(provider: PushProvider): void {
  pushProvider = provider;
}
