import {
  AutopayMandateStatus,
  AutopayPaymentMethod,
  LoanStatus,
} from '@prisma/client';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors/app-error';
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
            mandate.status as AutopayMandateStatus,
          )),
      canDisable: Boolean(
        mandate &&
          [AutopayMandateStatus.PENDING, AutopayMandateStatus.ACTIVE, AutopayMandateStatus.PAUSED].includes(
            mandate.status as AutopayMandateStatus,
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
      message:
        mandate.status === AutopayMandateStatus.PENDING
          ? 'Mandate created and pending approval.'
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
