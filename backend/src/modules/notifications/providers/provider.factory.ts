import type {
  EmailProvider,
  PushProvider,
  SmsProvider,
  WhatsAppProvider,
} from './channel-provider';
import {
  StubEmailProvider,
  StubPushProvider,
  StubSmsProvider,
  StubWhatsAppProvider,
} from './stub.providers';

let emailProvider: EmailProvider = new StubEmailProvider();
let smsProvider: SmsProvider = new StubSmsProvider();
let whatsappProvider: WhatsAppProvider = new StubWhatsAppProvider();
let pushProvider: PushProvider = new StubPushProvider();

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
