import crypto from 'node:crypto';
import {
  AutopayMandateStatus,
  AutopayProviderCode,
} from '@prisma/client';
import type {
  AutopayProvider,
  CancelMandateProviderInput,
  CancelMandateProviderResult,
  CreateMandateProviderInput,
  CreateMandateProviderResult,
  MandateStatusProviderResult,
} from './autopay-provider';

/**
 * Local/stub provider — no external network calls.
 * Creates a PENDING mandate that Admin (or a future webhook) can approve to ACTIVE.
 * Swap this for RazorpayAutopayProvider later without changing AutopayService.
 */
export class StubAutopayProvider implements AutopayProvider {
  readonly code = AutopayProviderCode.STUB;

  async createMandate(input: CreateMandateProviderInput): Promise<CreateMandateProviderResult> {
    const mandateId = `stub_md_${crypto.randomBytes(8).toString('hex')}`;
    const mandateReference = `LX-AP-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    return {
      provider: this.code,
      mandateId,
      mandateReference,
      status: AutopayMandateStatus.PENDING,
      raw: {
        simulated: true,
        message: 'Stub mandate created. Approve via Admin API to activate AutoPay.',
        loanAccountNumber: input.loanAccountNumber,
        paymentMethod: input.paymentMethod,
        maximumDebitAmount: input.maximumDebitAmount,
      },
    };
  }

  async cancelMandate(input: CancelMandateProviderInput): Promise<CancelMandateProviderResult> {
    return {
      status: AutopayMandateStatus.CANCELLED,
      raw: {
        simulated: true,
        mandateId: input.mandateId,
        mandateReference: input.mandateReference,
        cancelledAt: new Date().toISOString(),
      },
    };
  }

  async getMandateStatus(mandateId: string): Promise<MandateStatusProviderResult> {
    return {
      status: AutopayMandateStatus.PENDING,
      raw: {
        simulated: true,
        mandateId,
        note: 'Stub provider does not sync remote status. Use Admin PATCH to update.',
      },
    };
  }
}

export class RazorpayAutopayProvider implements AutopayProvider {
  readonly code = AutopayProviderCode.RAZORPAY;

  async createMandate(_input: CreateMandateProviderInput): Promise<CreateMandateProviderResult> {
    throw new Error(
      'Razorpay AutoPay provider is not configured yet. Set AUTOPAY_PROVIDER=STUB or implement Razorpay UPI AutoPay / eMandate.',
    );
  }

  async cancelMandate(_input: CancelMandateProviderInput): Promise<CancelMandateProviderResult> {
    throw new Error('Razorpay AutoPay provider is not configured yet.');
  }

  async getMandateStatus(_mandateId: string): Promise<MandateStatusProviderResult> {
    throw new Error('Razorpay AutoPay provider is not configured yet.');
  }
}
