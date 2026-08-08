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
 * Kept as an offline-dev escape hatch — the default is now RAZORPAY.
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

/**
 * Real Razorpay AutoDebit via the Subscriptions API (UPI AutoPay / eMandate).
 *
 * A monthly subscription is created for the loan and the customer authorises
 * the mandate from the returned `short_url`. Razorpay then collects the
 * recurring amount automatically on the schedule — the `invoice.paid` /
 * `invoice.payment_failed` webhooks (routed by the payment webhook) drive the
 * EMI completion / failure handling in AutopayService, so EMIs are collected
 * on the due date with no manual payment.
 */
export class RazorpayAutopayProvider implements AutopayProvider {
  readonly code = AutopayProviderCode.RAZORPAY;

  async createMandate(input: CreateMandateProviderInput): Promise<CreateMandateProviderResult> {
    const { getRazorpayClient } = await import('../../payment/service/razorpay.service');
    const client = getRazorpayClient();

    // Razorpay requires a valid 10-digit mobile in customer.contact — a UPI ID
    // or blank string makes the call fail. Fall back to a placeholder only when
    // the profile has no phone.
    const contact =
      (input.customerPhone ?? '').replace(/\D/g, '').slice(-10) || '0000000000';
    const customerName =
      input.customerName?.trim() || `Customer ${input.userId.slice(0, 8)}`;
    // Price each cycle at the real EMI amount (NOT the mandate cap — the cap
    // may be EMI x 1.2 and would overcharge the customer every cycle).
    const perCycle =
      input.amountPerCycle && input.amountPerCycle > 0
        ? input.amountPerCycle
        : input.maximumDebitAmount;
    const amountPaise = Math.max(100, Math.round(perCycle * 100));
    const totalCount =
      input.totalCount && input.totalCount > 0 ? input.totalCount : 12;

    // Monthly plan priced at the max debit amount (one EMI per cycle).
    const plan: any = await client.plans.create({
      period: 'monthly',
      interval: 1,
      item: {
        name: `EMI AutoDebit — ${input.loanAccountNumber}`,
        amount: amountPaise,
        currency: 'INR',
      },
    });
    const planId = String(plan?.id ?? '');
    if (!planId) {
      throw new Error('Razorpay plan creation failed — no plan id returned.');
    }

    // UPI AutoPay requires start_at >= 24h from creation; eMandate 48h.
    // Push the first debit out only as far as needed so the schedule stays
    // aligned with the loan's due dates.
    const minLeadSeconds =
      String(input.paymentMethod).toUpperCase() === 'EMANDATE' ? 2 * 86400 : 86400;
    let startAt: number | undefined;
    if (input.startAt) {
      const desired = Math.floor(input.startAt.getTime() / 1000);
      startAt = Math.max(desired, Math.floor(Date.now() / 1000) + minLeadSeconds);
    }

    const payload: any = {
      plan_id: planId,
      total_count: totalCount,
      customer_notify: 0,
      quantity: 1,
      notes: {
        type: 'EMI_AUTOPAY',
        loanAccountId: input.loanAccountId,
        loanAccountNumber: input.loanAccountNumber,
        userId: input.userId,
      },
      customer: {
        name: customerName,
        contact,
        email: '',
      },
    };
    if (startAt) payload.start_at = startAt;
    if (String(input.paymentMethod).toUpperCase() === 'EMANDATE') {
      payload.auth_type = 'netbanking';
      payload.payment_method = 'debit';
    }

    const subscription: any = await client.subscriptions.create(payload);
    const subscriptionId = String(subscription?.id ?? '');
    if (!subscriptionId) {
      throw new Error('Razorpay subscription creation failed — no subscription id returned.');
    }

    return {
      provider: this.code,
      mandateId: subscriptionId,
      mandateReference: `RZP-${subscriptionId}`,
      status: AutopayMandateStatus.PENDING,
      approvalUrl: subscription.short_url ? String(subscription.short_url) : null,
      raw: {
        subscriptionId,
        planId,
        shortUrl: subscription.short_url ?? null,
        status: String(subscription.status ?? ''),
        startAt: startAt ?? null,
        totalCount,
      },
    };
  }

  async cancelMandate(input: CancelMandateProviderInput): Promise<CancelMandateProviderResult> {
    const { getRazorpayClient } = await import('../../payment/service/razorpay.service');
    const client = getRazorpayClient();

    try {
      const cancelled: any = await client.subscriptions.cancel(input.mandateId);
      return {
        status: AutopayMandateStatus.CANCELLED,
        raw: { mandateId: input.mandateId, status: String(cancelled?.status ?? '') },
      };
    } catch (error: any) {
      const message = String(error?.message ?? error ?? '');
      // Only an already-cancelled / not-found subscription can be treated as
      // cancelled. Any other failure must surface so the local mandate stays
      // accurate and the loan keeps its AutoPay state.
      if (/already cancelled|canceled|not found|does not exist/i.test(message)) {
        return {
          status: AutopayMandateStatus.CANCELLED,
          raw: { mandateId: input.mandateId, error: message },
        };
      }
      throw error;
    }
  }

  async getMandateStatus(mandateId: string): Promise<MandateStatusProviderResult> {
    const { getRazorpayClient } = await import('../../payment/service/razorpay.service');
    const client = getRazorpayClient();

    try {
      const fetched: any = await client.subscriptions.fetch(mandateId);
      const rawStatus = String(fetched?.status ?? '').toLowerCase();
      let status: AutopayMandateStatus = AutopayMandateStatus.PENDING;
      if (rawStatus === 'authenticated' || rawStatus === 'active') {
        status = AutopayMandateStatus.ACTIVE;
      } else if (rawStatus === 'cancelled' || rawStatus === 'completed') {
        status = AutopayMandateStatus.CANCELLED;
      } else if (rawStatus === 'expired') {
        status = AutopayMandateStatus.EXPIRED;
      } else if (rawStatus === 'halted') {
        status = AutopayMandateStatus.FAILED;
      }
      return {
        status,
        raw: { mandateId, subscriptionStatus: rawStatus },
      };
    } catch (error: any) {
      return {
        status: AutopayMandateStatus.FAILED,
        raw: { mandateId, error: String(error?.message ?? error) },
      };
    }
  }
}
