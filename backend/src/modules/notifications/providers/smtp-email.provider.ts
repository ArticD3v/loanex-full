import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../../config/env';
import type { EmailProvider, OutboundMessage } from './channel-provider';

/**
 * Email via SMTP (nodemailer). Works with any provider that exposes SMTP —
 * SES, Brevo, Mailgun, Gmail App Password, etc. Configure SMTP_HOST/PORT,
 * optional SMTP_USER/SMTP_PASS, and SMTP_FROM in the environment.
 */
export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'SMTP';

  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
  }

  async sendEmail(message: OutboundMessage & { toEmail: string }): Promise<void> {
    if (!env.SMTP_HOST?.trim()) {
      throw new Error('SMTP_HOST is not configured — email notifications disabled');
    }
    if (!message.toEmail.trim()) {
      throw new Error('No recipient email for notification');
    }

    await this.transporter.sendMail({
      from: env.SMTP_FROM,
      to: message.toEmail.trim(),
      subject: message.title,
      text: message.body,
    });

    const maskEmail = (email: string) => email.replace(/^([^@]{1,3})[^@]*@/, '$1***@');
    console.info('[Email:SMTP] sent', {
      to: maskEmail(message.toEmail.trim()),
      subject: message.title,
    });
  }
}
