import {
  AutopayMandateStatus,
  AutopayPaymentMethod,
  LoanStatus,
  PaymentStatus,
} from '@prisma/client';
import { emiPaymentService } from '../../emi-payment/service/emi-payment.service';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors/app-error';
import { jsonDb } from '../../../config/json-db';
import { auditLogService } from '../../verification/service/audit-log.service';
import { getAutopayProvider } from '../providers/provider.factory';
import {
  autopayRepository,
} from '../repository/autopay.repository';
import { notificationService } from './notification.service';

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function mapMandate(mandate: {
  id: string;
  provider: string;
  mandateId: string;
  mandateReference: string;
  paymentMethod: string;
  bankName: string | null;
  upiId: string | null;
  maximumDebitAmount: { toString(): string } | number;
  frequency: string;
  nextDebitDate: Date | null;
  status: string;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  providerPayload?: Record<string, any> | null;
}) {
  return {
    id: mandate.id,
    provider: mandate.provider,
    mandateId: mandate.mandateId,
    mandateReference: mandate.mandateReference,
    paymentMethod: mandate.paymentMethod,
    bankName: mandate.bankName,
    upiId: mandate.upiId,
    maximumDebitAmount: toNumber(mandate.maximumDebitAmount),
    frequency: mandate.frequency,
    nextDebitDate: mandate.nextDebitDate,
    status: mandate.status,
    failureReason: mandate.failureReason,
    approvalUrl: mandate.providerPayload?.shortUrl ?? null,
    createdAt: mandate.createdAt,
    updatedAt: mandate.updatedAt,
  };
}

export class AutopayService {
  async getStatus(userId: string) {
    const loan = await autopayRepository.findActiveLoanForUser(userId);
    if (!loan) {
      throw new NotFoundError('No active loan found for AutoPay.');
    }

    const mandate = await autopayRepository.findCurrentMandate(loan.id);
    const options = [
      { code: 'UPI_AUTOPAY', label: 'UPI AutoPay' },
      { code: 'EMANDATE', label: 'eMandate' },
      { code: 'NACH', label: 'NACH' },
      { code: 'DEBIT_CARD', label: 'Debit Card Mandate' },
    ];

    return {
      loan: {
        id: loan.id,
        loanAccountNumber: loan.loanAccountNumber,
        applicationNumber: loan.application.id,
        emiAmount: toNumber(loan.emiAmount),
        nextEmiDueDate: loan.nextEmiDueDate,
        loanStatus: loan.loanStatus,
        autopayEnabled: loan.autopayEnabled,
      },
      autopayStatus: loan.autopayEnabled
        ? 'ENABLED'
        : mandate?.status === AutopayMandateStatus.PENDING
          ? 'PENDING'
          : 'DISABLED',
      mandate: mandate ? mapMandate(mandate) : null,
      options,
      canEnable:
        loan.loanStatus === LoanStatus.ACTIVE &&
        !loan.autopayEnabled &&
        (!mandate ||
          ![AutopayMandateStatus.PENDING, AutopayMandateStatus.ACTIVE].includes(
            mandate.status,
          )),
      canDisable: Boolean(
        mandate &&
          [AutopayMandateStatus.PENDING, AutopayMandateStatus.ACTIVE, AutopayMandateStatus.PAUSED].includes(
            mandate.status,
          ),
      ),
    };
  }

  async createMandate(
    userId: string,
    input: {
      paymentMethod: string;
      bankName?: string;
      upiId?: string;
      maximumDebitAmount?: number;
    },
  ) {
    const loan = await autopayRepository.findActiveLoanForUser(userId);
    if (!loan) throw new NotFoundError('No active loan found for AutoPay.');
    if (loan.loanStatus !== LoanStatus.ACTIVE) {
      throw new ForbiddenError('Only ACTIVE loans can enable AutoPay.');
    }

    const existing = await autopayRepository.findActiveOrPendingForLoan(loan.id);
    if (existing) {
      throw new ConflictError('Only one active or pending mandate is allowed per loan.', {
        mandateId: existing.id,
        status: existing.status,
      });
    }

    const paymentMethod = this.parseMethod(input.paymentMethod);
    if (paymentMethod === AutopayPaymentMethod.UPI_AUTOPAY && !input.upiId?.trim()) {
      throw new BadRequestError('UPI ID is required for UPI AutoPay.');
    }

    const maxDebit = round2(
      input.maximumDebitAmount && input.maximumDebitAmount > 0
        ? input.maximumDebitAmount
        : toNumber(loan.emiAmount) * 1.2,
    );

    // Real gateways (Razorpay) need the customer's actual mobile + name on the
    // mandate link — fall back gracefully when the profile is incomplete.
    const customer = jsonDb.findOne('users', { id: userId });
    const customerName =
      customer?.fullName || customer?.name || customer?.email?.split('@')[0] || null;
    const customerPhone = customer?.phone || customer?.mobile || null;

    // One billing cycle per remaining EMI so the subscription naturally ends
    // when the loan is paid off.
    const remainingEmis = (Array.isArray(loan.schedule) ? loan.schedule : []).filter(
      (row: any) => row.paymentStatus !== 'PAID',
    ).length;

    const provider = getAutopayProvider();
    const created = await provider.createMandate({
      loanAccountId: loan.id,
      loanAccountNumber: loan.loanAccountNumber,
      userId,
      paymentMethod,
      maximumDebitAmount: maxDebit,
      frequency: 'MONTHLY',
      nextDebitDate: loan.nextEmiDueDate,
      bankName: input.bankName ?? null,
      upiId: input.upiId ?? null,
      customerName,
      customerPhone,
      totalCount: remainingEmis > 0 ? remainingEmis : 12,
      startAt: loan.nextEmiDueDate ? new Date(loan.nextEmiDueDate) : null,
      // Price each cycle at the exact EMI — maxDebit (EMI x 1.2) is only the
      // mandate ceiling and must never be the per-cycle charge.
      amountPerCycle: toNumber(loan.emiAmount) > 0 ? toNumber(loan.emiAmount) : maxDebit,
    });

    const mandate = await autopayRepository.createMandate({
      userId,
      loanAccountId: loan.id,
      provider: created.provider,
      mandateId: created.mandateId,
      mandateReference: created.mandateReference,
      paymentMethod,
      bankName: input.bankName ?? null,
      upiId: input.upiId ?? null,
      maximumDebitAmount: maxDebit,
      frequency: 'MONTHLY',
      nextDebitDate: loan.nextEmiDueDate,
      status: created.status,
      providerPayload: created.raw,
    });

    await auditLogService.log({
      userId,
      action: 'MANDATE_CREATED',
      entity: 'autopay_mandates',
      metadata: {
        mandateReference: mandate.mandateReference,
        paymentMethod,
        status: mandate.status,
        provider: mandate.provider,
        timestamp: new Date().toISOString(),
      },
    });

    if (mandate.status === AutopayMandateStatus.ACTIVE) {
      await this.activateMandateSideEffects(mandate.id, userId, loan.id);
    }

    return {
      ...mapMandate(mandate),
      approvalUrl:
        (mandate.providerPayload?.shortUrl as string | undefined) ?? null,
      message:
        mandate.status === AutopayMandateStatus.PENDING
          ? 'Mandate created. Approve it from the payment link to activate AutoPay.'
          : 'AutoPay enabled successfully.',
    };
  }

  async cancelMandate(userId: string) {
    const loan = await autopayRepository.findActiveLoanForUser(userId);
    if (!loan) throw new NotFoundError('No active loan found for AutoPay.');

    const mandate = await autopayRepository.findCurrentMandate(loan.id);
    if (!mandate) throw new NotFoundError('No active AutoPay mandate found.');

    const provider = getAutopayProvider();
    const cancelled = await provider.cancelMandate({
      mandateId: mandate.mandateId,
      mandateReference: mandate.mandateReference,
      providerPayload: mandate.providerPayload,
    });

    const updated = await autopayRepository.updateMandateStatus(mandate.id, {
      status: cancelled.status,
      providerPayload: cancelled.raw,
    });
    await autopayRepository.setLoanAutopayEnabled(loan.id, false);

    await auditLogService.log({
      userId,
      action: 'MANDATE_CANCELLED',
      entity: 'autopay_mandates',
      metadata: {
        mandateReference: mandate.mandateReference,
        timestamp: new Date().toISOString(),
      },
    });

    await notificationService.notify({
      userId,
      event: 'AUTO_PAY_DISABLED',
      title: 'AutoPay disabled',
      message: `AutoPay has been disabled for loan ${loan.loanAccountNumber}.`,
      metadata: { loanAccountNumber: loan.loanAccountNumber, mandateReference: mandate.mandateReference },
    });

    return {
      ...mapMandate(updated),
      message: 'AutoPay mandate cancelled.',
    };
  }

  async getHistory(userId: string) {
    const items = await autopayRepository.listHistoryForUser(userId);
    return {
      total: items.length,
      items: items.map((item) => ({
        ...mapMandate(item),
        loanAccountNumber: item.loanAccount.loanAccountNumber,
        applicationNumber: item.loanAccount.application?.id ?? null,
      })),
    };
  }

  async listForAdmin(status?: string) {
    const parsed =
      status && Object.values(AutopayMandateStatus).includes(status as AutopayMandateStatus)
        ? (status as AutopayMandateStatus)
        : undefined;
    const items = await autopayRepository.listForAdmin(parsed);
    return {
      total: items.length,
      items: items.map((item) => ({
        ...mapMandate(item),
        loanAccountId: item.loanAccountId,
        loanAccountNumber: item.loanAccount.loanAccountNumber,
        autopayEnabled: item.loanAccount.autopayEnabled,
        customer: item.user
          ? {
              id: item.user.id,
              fullName: item.user.fullName,
              mobile: item.user.mobile,
              email: item.user.email,
            }
          : null,
      })),
    };
  }

  async getForAdmin(loanId: string) {
    const loan = await autopayRepository.findLoanById(loanId);
    if (!loan) throw new NotFoundError('Loan not found.');

    return {
      loan: {
        id: loan.id,
        loanAccountNumber: loan.loanAccountNumber,
        loanStatus: loan.loanStatus,
        autopayEnabled: loan.autopayEnabled,
        emiAmount: toNumber(loan.emiAmount),
        nextEmiDueDate: loan.nextEmiDueDate,
      },
      mandates: loan.autopayMandates.map(mapMandate),
      currentMandate: loan.autopayMandates.find((m) =>
        [AutopayMandateStatus.PENDING, AutopayMandateStatus.ACTIVE, AutopayMandateStatus.PAUSED].includes(
          m.status,
        ),
      )
        ? mapMandate(
            loan.autopayMandates.find((m) =>
              [AutopayMandateStatus.PENDING, AutopayMandateStatus.ACTIVE, AutopayMandateStatus.PAUSED].includes(
                m.status,
              ),
            )!,
          )
        : null,
    };
  }

  async adminUpdate(
    loanId: string,
    input: { status: AutopayMandateStatus; remarks?: string; updatedBy?: string },
  ) {
    const loan = await autopayRepository.findLoanById(loanId);
    if (!loan) throw new NotFoundError('Loan not found.');

    const mandate = loan.autopayMandates.find((m) =>
      [AutopayMandateStatus.PENDING, AutopayMandateStatus.ACTIVE, AutopayMandateStatus.PAUSED].includes(
        m.status,
      ),
    );
    if (!mandate) throw new NotFoundError('No open AutoPay mandate found for this loan.');

    const updated = await autopayRepository.updateMandateStatus(mandate.id, {
      status: input.status,
      failureReason: input.remarks ?? null,
    });

    if (input.status === AutopayMandateStatus.ACTIVE) {
      await this.activateMandateSideEffects(mandate.id, loan.userId, loan.id);
    } else if (
      input.status === AutopayMandateStatus.CANCELLED ||
      input.status === AutopayMandateStatus.FAILED ||
      input.status === AutopayMandateStatus.EXPIRED
    ) {
      await autopayRepository.setLoanAutopayEnabled(loan.id, false);
      await notificationService.notify({
        userId: loan.userId,
        event: input.status === AutopayMandateStatus.FAILED ? 'AUTO_PAY_FAILED' : 'AUTO_PAY_DISABLED',
        title: input.status === AutopayMandateStatus.FAILED ? 'AutoPay failed' : 'AutoPay disabled',
        message: `AutoPay status updated to ${input.status} for loan ${loan.loanAccountNumber}.`,
        metadata: { loanId, status: input.status, remarks: input.remarks ?? null },
      });
    } else if (input.status === AutopayMandateStatus.PAUSED) {
      await autopayRepository.setLoanAutopayEnabled(loan.id, false);
    }

    await auditLogService.log({
      userId: loan.userId,
      action:
        input.status === AutopayMandateStatus.ACTIVE
          ? 'MANDATE_APPROVED'
          : input.status === AutopayMandateStatus.CANCELLED
            ? 'MANDATE_CANCELLED'
            : 'MANDATE_CREATED',
      entity: 'autopay_mandates',
      metadata: {
        loanId,
        status: input.status,
        updatedBy: input.updatedBy ?? 'admin',
        remarks: input.remarks ?? null,
        timestamp: new Date().toISOString(),
      },
    });

    return mapMandate(updated);
  }

  /**
   * Razorpay webhook entry point for AutoDebit (called by the payment webhook
   * after signature validation). Handles subscription lifecycle events and
   * recurring invoice collection — the actual "collect EMI automatically on
   * the due date" path.
   */
  async handleRazorpayWebhook(eventName: string, event: any) {
    const subscriptionId = String(
      event?.payload?.subscription?.entity?.id ??
        event?.payload?.invoice?.entity?.subscription_id ??
        '',
    );

    if (eventName.startsWith('subscription.')) {
      return this.handleSubscriptionEvent(eventName, subscriptionId, event);
    }
    if (eventName === 'invoice.paid') {
      return this.handleInvoicePaid(subscriptionId, event);
    }
    if (eventName === 'invoice.payment_failed') {
      return this.handleInvoicePaymentFailed(subscriptionId, event);
    }
    return { handled: false, reason: 'UNHANDLED_AUTOPAY_EVENT', event: eventName };
  }

  private async handleSubscriptionEvent(
    eventName: string,
    subscriptionId: string,
    event: any,
  ) {
    const mandate = await autopayRepository.findByMandateId(subscriptionId);
    if (!mandate) {
      return { handled: false, reason: 'UNKNOWN_SUBSCRIPTION', event: eventName };
    }

    const entity = event?.payload?.subscription?.entity ?? {};
    const rawStatus = String(entity?.status ?? '').toLowerCase();

    if (
      eventName === 'subscription.authenticated' ||
      eventName === 'subscription.activated' ||
      rawStatus === 'active' ||
      rawStatus === 'authenticated'
    ) {
      if (mandate.status === AutopayMandateStatus.ACTIVE) {
        return { handled: true, alreadyProcessed: true, event: eventName };
      }
      await autopayRepository.updateMandateStatus(mandate.id, {
        status: AutopayMandateStatus.ACTIVE,
        providerPayload: {
          ...(mandate.providerPayload ?? {}),
          lastWebhook: eventName,
          subscriptionStatus: rawStatus,
        },
      });
      await autopayRepository.setLoanAutopayEnabled(mandate.loanAccountId, true);
      await this.activateMandateSideEffects(mandate.id, mandate.userId, mandate.loanAccountId);
      return { handled: true, status: 'ACTIVE', event: eventName };
    }

    if (eventName === 'subscription.halted' || rawStatus === 'halted') {
      await autopayRepository.updateMandateStatus(mandate.id, {
        status: AutopayMandateStatus.FAILED,
        failureReason: 'Recurring EMI collection failed repeatedly — subscription halted by Razorpay.',
        providerPayload: {
          ...(mandate.providerPayload ?? {}),
          lastWebhook: eventName,
          subscriptionStatus: rawStatus,
        },
      });
      await autopayRepository.setLoanAutopayEnabled(mandate.loanAccountId, false);
      await notificationService.notify({
        userId: mandate.userId,
        event: 'AUTO_PAY_FAILED',
        title: 'AutoPay halted',
        message:
          'Recurring EMI collection failed repeatedly. Please pay your EMI manually.',
        metadata: { loanAccountId: mandate.loanAccountId, subscriptionId },
      });
      await auditLogService.log({
        userId: mandate.userId,
        action: 'MANDATE_HALTED',
        entity: 'autopay_mandates',
        metadata: { mandateId: mandate.id, subscriptionId, timestamp: new Date().toISOString() },
      });
      return { handled: true, status: 'FAILED', event: eventName };
    }

    if (
      eventName === 'subscription.cancelled' ||
      eventName === 'subscription.completed' ||
      eventName === 'subscription.expired' ||
      rawStatus === 'cancelled' ||
      rawStatus === 'completed' ||
      rawStatus === 'expired'
    ) {
      const status =
        rawStatus === 'expired'
          ? AutopayMandateStatus.EXPIRED
          : AutopayMandateStatus.CANCELLED;
      await autopayRepository.updateMandateStatus(mandate.id, {
        status,
        providerPayload: {
          ...(mandate.providerPayload ?? {}),
          lastWebhook: eventName,
          subscriptionStatus: rawStatus,
        },
      });
      await autopayRepository.setLoanAutopayEnabled(mandate.loanAccountId, false);
      await notificationService.notify({
        userId: mandate.userId,
        event: 'AUTO_PAY_DISABLED',
        title: status === AutopayMandateStatus.EXPIRED ? 'AutoPay expired' : 'AutoPay disabled',
        message: `AutoPay ${status === AutopayMandateStatus.EXPIRED ? 'expired' : 'was disabled'}. You can pay EMIs manually from My EMI.`,
        metadata: { loanAccountId: mandate.loanAccountId, subscriptionId, status },
      });
      await auditLogService.log({
        userId: mandate.userId,
        action: 'MANDATE_CLOSED',
        entity: 'autopay_mandates',
        metadata: { mandateId: mandate.id, subscriptionId, status, timestamp: new Date().toISOString() },
      });
      return { handled: true, status, event: eventName };
    }

    return { handled: false, reason: 'UNHANDLED_SUBSCRIPTION_EVENT', event: eventName };
  }

  /**
   * `invoice.paid` — Razorpay collected the recurring EMI. Mark the next
   * unpaid instalment PAID and roll the loan forward, exactly like a manual
   * payment (receipt, audit, notification included).
   */
  private async handleInvoicePaid(subscriptionId: string, event: any) {
    const mandate = await autopayRepository.findByMandateId(subscriptionId);
    if (!mandate || !mandate.loanAccount) {
      return { handled: false, reason: 'UNKNOWN_SUBSCRIPTION', event: 'invoice.paid' };
    }

    const invoice = event?.payload?.invoice?.entity ?? {};
    const razorpayPaymentId = String(
      invoice?.payment_id ??
        invoice?.payments?.[0]?.payment_id ??
        invoice?.payment?.entity?.id ??
        '',
    );
    if (!razorpayPaymentId) {
      return { handled: false, reason: 'NO_PAYMENT_ID', event: 'invoice.paid' };
    }

    // Dedup — Razorpay redelivers webhooks; never double-complete an EMI.
    const existing = await autopayRepository.findTransactionByPaymentId(razorpayPaymentId);
    if (existing?.paymentStatus === PaymentStatus.SUCCESS) {
      return { handled: true, alreadyProcessed: true, event: 'invoice.paid' };
    }

    const loan = await autopayRepository.findLoanById(mandate.loanAccountId);
    if (!loan) return { handled: false, reason: 'LOAN_NOT_FOUND', event: 'invoice.paid' };

    const unpaid = (loan.schedule ?? [])
      .filter((row: any) => row.paymentStatus !== 'PAID')
      .sort((a: any, b: any) => a.emiNumber - b.emiNumber);
    const nextEmi = unpaid[0];
    if (!nextEmi) {
      return { handled: true, alreadyProcessed: true, reason: 'NO_UNPAID_EMI', event: 'invoice.paid' };
    }

    const amountPaise = Number(invoice?.amount_paid ?? invoice?.amount ?? 0);
    const amountInr = Math.round((amountPaise / 100) * 100) / 100;
    const chargedAmount = amountInr || toNumber(nextEmi.emiAmount);

    // A PENDING transaction means a previous delivery created the row but the
    // completion crashed before marking SUCCESS — finish the job instead of
    // skipping, so the EMI is never left unpaid.
    const transaction =
      existing?.paymentStatus === PaymentStatus.PENDING &&
      existing.emiScheduleId === nextEmi.id
        ? existing
        : autopayRepository.createAutoCollectTransaction({
            applicationId: loan.applicationId,
            userId: loan.userId,
            emiScheduleId: nextEmi.id,
            razorpayPaymentId,
            amount: chargedAmount,
          });

    const completed = (await emiPaymentService.completeEmiFromWebhook(
      {
        id: transaction.id,
        userId: loan.userId,
        emiScheduleId: nextEmi.id,
        amount: chargedAmount,
      },
      razorpayPaymentId,
      'invoice.paid',
    )) as {
      handled: boolean;
      alreadyProcessed?: boolean;
      emiNumber?: number;
      outstandingAmount?: number;
      unpaidCount?: number;
      remainingEmis?: number;
    };

    await notificationService.notify({
      userId: loan.userId,
      event: 'AUTO_PAY_SUCCESS',
      title: 'EMI paid automatically',
      message: `EMI #${nextEmi.emiNumber} of ${toNumber(nextEmi.emiAmount)} was collected automatically for loan ${loan.loanAccountNumber}.`,
      metadata: {
        loanAccountId: loan.id,
        loanAccountNumber: loan.loanAccountNumber,
        emiNumber: nextEmi.emiNumber,
        razorpayPaymentId,
      },
    });

    await auditLogService.log({
      userId: loan.userId,
      action: 'AUTOPAY_EMI_COLLECTED',
      entity: 'autopay_mandates',
      metadata: {
        emiId: nextEmi.id,
        emiNumber: nextEmi.emiNumber,
        razorpayPaymentId,
        amount: amountInr || toNumber(nextEmi.emiAmount),
        outstandingAmount: completed.outstandingAmount,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      handled: true,
      alreadyProcessed: false,
      emiNumber: nextEmi.emiNumber,
      outstandingAmount: completed.outstandingAmount,
      remainingEmis: completed.unpaidCount ?? completed.remainingEmis ?? 0,
      event: 'invoice.paid',
    };
  }

  /**
   * `invoice.payment_failed` — the recurring charge bounced. Record the failed
   * attempt and notify; the EMI stays PENDING/OVERDUE so the customer can pay
   * manually (Razorpay retries, and a later invoice.paid completes it).
   */
  private async handleInvoicePaymentFailed(subscriptionId: string, event: any) {
    const mandate = await autopayRepository.findByMandateId(subscriptionId);
    if (!mandate || !mandate.loanAccount) {
      return { handled: false, reason: 'UNKNOWN_SUBSCRIPTION', event: 'invoice.payment_failed' };
    }

    const invoice = event?.payload?.invoice?.entity ?? {};
    const razorpayPaymentId = String(invoice?.payment_id ?? invoice?.payments?.[0]?.payment_id ?? '');

    if (razorpayPaymentId) {
      const existing = await autopayRepository.findTransactionByPaymentId(razorpayPaymentId);
      if (!existing) {
        const loan = await autopayRepository.findLoanById(mandate.loanAccountId);
        const unpaid = (loan?.schedule ?? [])
          .filter((row: any) => row.paymentStatus !== 'PAID')
          .sort((a: any, b: any) => a.emiNumber - b.emiNumber);
        const nextEmi = unpaid[0];
        if (loan && nextEmi) {
          const amountPaise = Number(invoice?.amount ?? 0);
          const failed = autopayRepository.createAutoCollectTransaction({
            applicationId: loan.applicationId,
            userId: loan.userId,
            emiScheduleId: nextEmi.id,
            razorpayPaymentId,
            amount: Math.round((amountPaise / 100) * 100) / 100 || toNumber(nextEmi.emiAmount),
          });
          jsonDb.update('paymentTransaction', { id: failed.id }, { paymentStatus: PaymentStatus.FAILED });
        }
      }
    }

    await notificationService.notify({
      userId: mandate.userId,
      event: 'AUTO_PAY_FAILED',
      title: 'EMI collection failed',
      message: 'Automatic EMI collection failed. Please pay this EMI manually from My EMI.',
      metadata: { loanAccountId: mandate.loanAccountId, subscriptionId },
    });

    await auditLogService.log({
      userId: mandate.userId,
      action: 'AUTOPAY_EMI_FAILED',
      entity: 'autopay_mandates',
      metadata: { subscriptionId, event: 'invoice.payment_failed', timestamp: new Date().toISOString() },
    });

    return { handled: true, event: 'invoice.payment_failed' };
  }

  async disableForClosedLoan(loanAccountId: string, userId: string) {
    await autopayRepository.cancelOpenMandatesForLoan(loanAccountId);
    await autopayRepository.setLoanAutopayEnabled(loanAccountId, false);
    await notificationService.notify({
      userId,
      event: 'AUTO_PAY_DISABLED',
      title: 'AutoPay disabled',
      message: 'AutoPay was disabled because the loan was closed.',
      metadata: { loanAccountId },
    });
  }

  private async activateMandateSideEffects(mandateId: string, userId: string, loanId: string) {
    await autopayRepository.setLoanAutopayEnabled(loanId, true);
    await auditLogService.log({
      userId,
      action: 'MANDATE_APPROVED',
      entity: 'autopay_mandates',
      metadata: { mandateId, loanId, timestamp: new Date().toISOString() },
    });
    await notificationService.notify({
      userId,
      event: 'AUTO_PAY_ENABLED',
      title: 'AutoPay enabled',
      message: 'Your EMI AutoPay mandate is active. Instalments will be collected on the due date.',
      metadata: { mandateId, loanId },
    });
  }

  private parseMethod(value: string): AutopayPaymentMethod {
    const upper = value.toUpperCase().replace(/\s+/g, '_');
    if (!Object.values(AutopayPaymentMethod).includes(upper as AutopayPaymentMethod)) {
      throw new BadRequestError('Invalid AutoPay payment method.', { paymentMethod: value });
    }
    return upper as AutopayPaymentMethod;
  }
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export const autopayService = new AutopayService();
