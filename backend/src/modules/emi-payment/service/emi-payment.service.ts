import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import PDFDocument from 'pdfkit';
import {
  EmiPaymentStatus,
  LoanStatus,
  PaymentStatus,
  PaymentType,
} from '@prisma/client';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors/app-error';
import { env } from '../../../config/env';
import {
  createRazorpayOrder,
  getRazorpayKeyId,
  isPaymentDevBypass,
  signDevPayment,
  verifyRazorpaySignature,
} from '../../payment/service/razorpay.service';
import { auditLogService } from '../../verification/service/audit-log.service';
import { productImagePath } from '../../loan/service/loan-payload.service';
import { emiPaymentRepository } from '../repository/emi-payment.repository';

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function effectiveStatus(
  status: EmiPaymentStatus,
  dueDate: Date,
  asOf: Date = new Date(),
): EmiPaymentStatus {
  if (status === EmiPaymentStatus.PAID || status === EmiPaymentStatus.FAILED) return status;
  if (dueDate < asOf && status === EmiPaymentStatus.PENDING) return EmiPaymentStatus.OVERDUE;
  return status;
}

function buildCharges(input: {
  principalAmount: number;
  interestAmount: number;
  emiAmount: number;
  status: EmiPaymentStatus;
}) {
  const lateFee =
    input.status === EmiPaymentStatus.OVERDUE
      ? round2(Math.max(100, (input.emiAmount * env.EMI_LATE_FEE_PERCENT) / 100))
      : 0;
  const gst = lateFee > 0 ? round2((lateFee * env.GST_PERCENT) / 100) : 0;
  const grandTotal = round2(input.emiAmount + lateFee + gst);

  return {
    principal: round2(input.principalAmount),
    interest: round2(input.interestAmount),
    penalty: lateFee,
    lateFee,
    gst,
    gstPercent: env.GST_PERCENT,
    emiAmount: round2(input.emiAmount),
    grandTotal,
  };
}

export class EmiPaymentService {
  async getByEmiId(emiId: string, userId: string) {
    const schedule = await emiPaymentRepository.findScheduleByIdForUser(emiId, userId);
    if (!schedule) throw new NotFoundError('EMI instalment not found.');

    const loan = schedule.loanAccount;
    if (loan.loanStatus !== LoanStatus.ACTIVE) {
      throw new ForbiddenError('EMI payments are available only for ACTIVE loans.');
    }

    const status = effectiveStatus(schedule.paymentStatus, schedule.dueDate);
    const charges = buildCharges({
      principalAmount: toNumber(schedule.principalAmount),
      interestAmount: toNumber(schedule.interestAmount),
      emiAmount: toNumber(schedule.emiAmount),
      status,
    });

    const payable = this.assertPayable(schedule, status);

    return {
      emiId: schedule.id,
      loan: {
        id: loan.id,
        loanAccountNumber: loan.loanAccountNumber,
        applicationNumber: loan.application.id,
        productName: loan.application.productName,
        productImage: productImagePath(loan.productId),
        loanStatus: loan.loanStatus,
      },
      emi: {
        emiNumber: schedule.emiNumber,
        dueDate: schedule.dueDate,
        principalAmount: charges.principal,
        interestAmount: charges.interest,
        lateFee: charges.lateFee,
        gst: charges.gst,
        totalPayable: charges.grandTotal,
        paymentStatus: status,
        paidAt: schedule.paidAt,
        transactionId: schedule.transactionId,
      },
      paymentSummary: {
        principal: charges.principal,
        interest: charges.interest,
        penalty: charges.penalty,
        gst: charges.gst,
        grandTotal: charges.grandTotal,
      },
      paymentMethod: {
        provider: 'Razorpay',
        label: 'Secure Payment',
      },
      canPay: payable.ok && status !== EmiPaymentStatus.PAID,
      alreadyPaid: status === EmiPaymentStatus.PAID,
      paymentDevBypass: isPaymentDevBypass(),
      existingPayment: schedule.paymentTransaction
        ? {
            id: schedule.paymentTransaction.id,
            paymentStatus: schedule.paymentTransaction.paymentStatus,
            razorpayOrderId: schedule.paymentTransaction.razorpayOrderId,
            razorpayPaymentId: schedule.paymentTransaction.razorpayPaymentId,
          }
        : null,
      receiptAvailable: Boolean(schedule.paidAt),
    };
  }

  async createOrder(emiId: string, userId: string) {
    const details = await this.getByEmiId(emiId, userId);
    if (details.alreadyPaid) {
      throw new ConflictError('This EMI is already paid.');
    }
    if (!details.canPay) {
      throw new BadRequestError('Only the current or overdue EMI can be paid.');
    }

    const existingSuccess = await emiPaymentRepository.findSuccessByEmiId(emiId);
    if (existingSuccess) {
      throw new ConflictError('A successful payment already exists for this EMI.');
    }

    const schedule = await emiPaymentRepository.findScheduleByIdForUser(emiId, userId);
    if (!schedule) throw new NotFoundError('EMI instalment not found.');

    if (
      schedule.paymentTransaction &&
      schedule.paymentTransaction.paymentStatus === PaymentStatus.PENDING
    ) {
      // Reuse pending order if amount matches
      if (Number(schedule.paymentTransaction.amount) === details.paymentSummary.grandTotal) {
        await auditLogService.log({
          userId,
          action: 'EMI_PAYMENT_INITIATED',
          entity: 'payment_transactions',
          metadata: {
            emiId,
            reused: true,
            razorpayOrderId: schedule.paymentTransaction.razorpayOrderId,
            amount: details.paymentSummary.grandTotal,
            timestamp: new Date().toISOString(),
          },
        });

        return this.buildCreateOrderResponse(
          schedule.paymentTransaction.razorpayOrderId,
          details,
          schedule.loanAccount.user,
        );
      }
    }

    const razorpayOrder = await createRazorpayOrder({
      amountInr: details.paymentSummary.grandTotal,
      receipt: `emi-${schedule.emiNumber}-${Date.now()}`.slice(0, 40),
      notes: {
        type: 'EMI',
        emiId: schedule.id,
        loanAccountNumber: schedule.loanAccount.loanAccountNumber,
        emiNumber: String(schedule.emiNumber),
      },
    });

    await emiPaymentRepository.createEmiTransaction({
      applicationId: schedule.loanAccount.applicationId,
      userId,
      emiScheduleId: schedule.id,
      razorpayOrderId: razorpayOrder.id,
      amount: details.paymentSummary.grandTotal,
    });

    await auditLogService.log({
      userId,
      action: 'EMI_PAYMENT_INITIATED',
      entity: 'payment_transactions',
      metadata: {
        emiId,
        razorpayOrderId: razorpayOrder.id,
        amount: details.paymentSummary.grandTotal,
        timestamp: new Date().toISOString(),
      },
    });

    return this.buildCreateOrderResponse(razorpayOrder.id, details, schedule.loanAccount.user);
  }

  async verify(
    userId: string,
    input: {
      emiId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) {
    const payment = await emiPaymentRepository.findByRazorpayOrderId(input.razorpayOrderId);
    if (!payment || payment.userId !== userId || payment.paymentType !== PaymentType.EMI) {
      throw new NotFoundError('EMI payment order not found.');
    }
    if (payment.emiScheduleId !== input.emiId) {
      throw new BadRequestError('EMI payment order does not match this instalment.');
    }

    if (payment.paymentStatus === PaymentStatus.SUCCESS) {
      return {
        success: true,
        alreadyProcessed: true,
        emiId: input.emiId,
        paymentId: payment.razorpayPaymentId,
        message: 'EMI already marked as paid.',
      };
    }

    const valid = verifyRazorpaySignature({
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
    });

    if (!valid) {
      await emiPaymentRepository.markFailed(payment.id);
      await auditLogService.log({
        userId,
        action: 'EMI_PAYMENT_FAILED',
        entity: 'payment_transactions',
        metadata: {
          emiId: input.emiId,
          razorpayOrderId: input.razorpayOrderId,
          reason: 'INVALID_SIGNATURE',
          timestamp: new Date().toISOString(),
        },
      });
      throw new BadRequestError('Invalid Razorpay signature.');
    }

    const schedule = await emiPaymentRepository.findScheduleByIdForUser(input.emiId, userId);
    if (!schedule) throw new NotFoundError('EMI instalment not found.');
    if (schedule.paymentStatus === EmiPaymentStatus.PAID) {
      throw new ConflictError('This EMI is already paid.');
    }

    const receiptPath = await this.generateReceiptPdf({
      loanAccountNumber: schedule.loanAccount.loanAccountNumber,
      applicationNumber: schedule.loanAccount.application.id,
      productName: schedule.loanAccount.application.productName,
      emiNumber: schedule.emiNumber,
      amount: toNumber(payment.amount),
      razorpayPaymentId: input.razorpayPaymentId,
      paidAt: new Date(),
    });

    const result = await emiPaymentRepository.completeEmiPayment({
      paymentId: payment.id,
      emiScheduleId: schedule.id,
      loanAccountId: schedule.loanAccountId,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
      paidAmount: toNumber(payment.amount),
      receiptPath,
    });

    await emiPaymentRepository.updateReceiptPath(payment.id, receiptPath);

    await auditLogService.log({
      userId,
      action: 'EMI_PAYMENT_SUCCESS',
      entity: 'payment_transactions',
      metadata: {
        emiId: input.emiId,
        emiNumber: schedule.emiNumber,
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        amount: toNumber(payment.amount),
        outstandingAmount: result.outstandingAmount,
        remainingEmis: result.unpaidCount,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      success: true,
      alreadyProcessed: false,
      emiId: input.emiId,
      emiNumber: schedule.emiNumber,
      paymentId: input.razorpayPaymentId,
      paidAmount: toNumber(payment.amount),
      outstandingAmount: result.outstandingAmount,
      remainingEmis: result.unpaidCount,
      nextEmiDueDate: result.nextEmiDueDate,
      receiptAvailable: true,
      message: 'EMI payment successful.',
    };
  }

  async createDevBypassSignature(userId: string, razorpayOrderId: string) {
    if (!isPaymentDevBypass()) {
      throw new ForbiddenError('Dev payment bypass is disabled.');
    }

    const payment = await emiPaymentRepository.findByRazorpayOrderId(razorpayOrderId);
    if (!payment || payment.userId !== userId || payment.paymentType !== PaymentType.EMI) {
      throw new NotFoundError('EMI payment order not found.');
    }

    const razorpayPaymentId = `pay_dev_${crypto.randomBytes(8).toString('hex')}`;
    const razorpaySignature = signDevPayment(razorpayOrderId, razorpayPaymentId);

    return {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      emiId: payment.emiScheduleId,
    };
  }

  async getReceipt(emiId: string, userId: string) {
    const schedule = await emiPaymentRepository.findScheduleByIdForUser(emiId, userId);
    if (!schedule) throw new NotFoundError('EMI instalment not found.');
    if (schedule.paymentStatus !== EmiPaymentStatus.PAID) {
      throw new BadRequestError('Receipt is available only after successful EMI payment.');
    }

    const payment = schedule.paymentTransaction;
    let absolutePath: string | null = null;

    if (payment?.receiptPath) {
      const candidate = path.resolve(process.cwd(), payment.receiptPath);
      if (fs.existsSync(candidate)) absolutePath = candidate;
    }

    if (!absolutePath) {
      const relative = await this.generateReceiptPdf({
        loanAccountNumber: schedule.loanAccount.loanAccountNumber,
        applicationNumber: schedule.loanAccount.application.id,
        productName: schedule.loanAccount.application.productName,
        emiNumber: schedule.emiNumber,
        amount: toNumber(schedule.paidAmount ?? schedule.emiAmount),
        razorpayPaymentId: schedule.transactionId ?? 'N/A',
        paidAt: schedule.paidAt ?? new Date(),
      });
      if (payment) {
        await emiPaymentRepository.updateReceiptPath(payment.id, relative);
      }
      absolutePath = path.resolve(process.cwd(), relative);
    }

    return {
      absolutePath,
      fileName: `${schedule.loanAccount.loanAccountNumber}-emi-${schedule.emiNumber}-receipt.pdf`,
    };
  }

  async listForAdmin(loanId?: string) {
    if (!loanId) {
      throw new BadRequestError('loanId query parameter is required.');
    }

    const items = await emiPaymentRepository.listEmiPaymentsForLoan(loanId);
    return {
      total: items.length,
      items: items.map((item) => ({
        id: item.id,
        emiScheduleId: item.emiScheduleId,
        emiNumber: item.emiSchedule?.emiNumber ?? null,
        amount: toNumber(item.amount),
        paymentStatus: item.paymentStatus,
        razorpayOrderId: item.razorpayOrderId,
        razorpayPaymentId: item.razorpayPaymentId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    };
  }

  private assertPayable(
    schedule: {
      id: string;
      emiNumber: number;
      paymentStatus: EmiPaymentStatus;
      loanAccount: { schedule: Array<{ id: string; emiNumber: number; paymentStatus: EmiPaymentStatus }> };
    },
    status: EmiPaymentStatus,
  ): { ok: boolean; reason?: string } {
    if (status === EmiPaymentStatus.PAID) {
      return { ok: false, reason: 'ALREADY_PAID' };
    }

    const unpaid = schedule.loanAccount.schedule
      .filter((row) => row.paymentStatus !== EmiPaymentStatus.PAID)
      .sort((a, b) => a.emiNumber - b.emiNumber);
    const current = unpaid[0];
    if (!current || current.id !== schedule.id) {
      return { ok: false, reason: 'FUTURE_EMI' };
    }

    if (status !== EmiPaymentStatus.PENDING && status !== EmiPaymentStatus.OVERDUE) {
      return { ok: false, reason: 'INVALID_STATUS' };
    }

    return { ok: true };
  }

  private buildCreateOrderResponse(
    razorpayOrderId: string,
    details: Awaited<ReturnType<EmiPaymentService['getByEmiId']>>,
    user?: { fullName: string; email: string; mobile: string } | null,
  ) {
    return {
      emiId: details.emiId,
      razorpayOrderId,
      keyId: getRazorpayKeyId(),
      amount: details.paymentSummary.grandTotal,
      amountPaise: Math.round(details.paymentSummary.grandTotal * 100),
      currency: env.RAZORPAY_CURRENCY,
      paymentDevBypass: isPaymentDevBypass(),
      paymentSummary: details.paymentSummary,
      prefill: {
        name: user?.fullName ?? '',
        email: user?.email ?? '',
        contact: user?.mobile ?? '',
      },
      notes: {
        type: 'EMI',
        emiId: details.emiId,
        loanAccountNumber: details.loan.loanAccountNumber,
      },
    };
  }

  private async generateReceiptPdf(input: {
    loanAccountNumber: string;
    applicationNumber: string;
    productName: string | null;
    emiNumber: number;
    amount: number;
    razorpayPaymentId: string;
    paidAt: Date;
  }): Promise<string> {
    const dir = path.resolve(process.cwd(), 'storage', 'emi-receipts');
    fs.mkdirSync(dir, { recursive: true });
    const fileName = `${input.loanAccountNumber}-emi-${input.emiNumber}-receipt.pdf`;
    const absolutePath = path.join(dir, fileName);
    const relativePath = path.join('storage', 'emi-receipts', fileName);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(absolutePath);
      doc.pipe(stream);

      doc.fontSize(20).fillColor('#0A2E6F').text('LoanEx EMI Payment Receipt');
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#111827');
      doc.text(`Loan Account: ${input.loanAccountNumber}`);
      doc.text(`Application: ${input.applicationNumber}`);
      doc.text(`Product: ${input.productName ?? '—'}`);
      doc.text(`EMI Number: #${input.emiNumber}`);
      doc.text(`Amount Paid: INR ${input.amount.toFixed(2)}`);
      doc.text(`Payment ID: ${input.razorpayPaymentId}`);
      doc.text(`Paid At: ${input.paidAt instanceof Date ? input.paidAt.toISOString() : String(input.paidAt ?? '')}`);
      doc.moveDown();
      doc.fontSize(10).fillColor('#6B7280').text('System-generated receipt from LoanEx.');
      doc.end();

      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });

    return relativePath;
  }
}

export const emiPaymentService = new EmiPaymentService();
