import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../../common/errors/app-error';
import { jsonDb } from '../../../config/json-db';
import { auditLogService } from '../../verification/service/audit-log.service';

export enum EmiApplicationStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  DOWN_PAYMENT_PENDING = 'DOWN_PAYMENT_PENDING',
  DOWN_PAYMENT_COMPLETED = 'DOWN_PAYMENT_COMPLETED',
  ORDER_CONFIRMED = 'ORDER_CONFIRMED',
  ACTIVE_EMI = 'ACTIVE_EMI',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export type EmiApplication = any;

import {
  LoanStatus,
  loanRepository,
  type LoanWithRelations,
} from '../repository/loan.repository';
import { addMonths, buildEmiSchedule } from './emi-calculator.service';
import {
  buildDashboardPayload,
  buildLoanSummary,
  buildPaymentHistoryPayload,
  productImagePath,
} from './loan-payload.service';

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export class LoanService {
  async getCurrent(userId: string) {
    const loans = await loanRepository.listUserLoans(userId);
    const active = loans.find((item) => item.loanStatus === LoanStatus.ACTIVE) ?? loans[0];
    if (!active) {
      throw new NotFoundError('No loan account found for this user');
    }
    return buildLoanSummary(active);
  }

  async listUserLoans(userId: string) {
    const list = await loanRepository.listUserLoans(userId);
    return list.map(buildLoanSummary);
  }

  async getLoanDetails(userId: string, loanId: string) {
    const loan = await loanRepository.findByIdForUser(loanId, userId);
    if (!loan) {
      throw new NotFoundError('Loan account not found');
    }
    return buildLoanSummary(loan);
  }

  async getDashboard(userId: string, loanId?: string) {
    const loans = await loanRepository.listUserLoans(userId);
    if (!loans.length) {
      throw new NotFoundError('No active loans found for user');
    }

    const selected = loanId
      ? loans.find((item) => item.id === loanId)
      : loans.find((item) => item.loanStatus === LoanStatus.ACTIVE) ?? loans[0];

    if (!selected) {
      throw new NotFoundError('Specified loan account not found');
    }

    return buildDashboardPayload(selected);
  }

  async getPaymentHistory(userId: string, loanId?: string) {
    const loans = await loanRepository.listUserLoans(userId);
    const loan = loanId
      ? loans.find((item) => item.id === loanId)
      : loans.find((item) => item.loanStatus === LoanStatus.ACTIVE) ?? loans[0];
    if (!loan) {
      throw new NotFoundError('Loan account not found');
    }
    return buildPaymentHistoryPayload(loan);
  }

  async getStatement(userId: string) {
    const loans = await loanRepository.listUserLoans(userId);
    const loan = loans.find((item) => item.loanStatus === LoanStatus.ACTIVE) ?? loans[0];
    if (!loan) {
      throw new NotFoundError('Loan account not found');
    }
    const file = await this.generateDocument(userId, loan.id, 'statement');
    return {
      ...file,
      fileName: path.basename(file.relativePath),
    };
  }

  async getAgreement(userId: string) {
    const loans = await loanRepository.listUserLoans(userId);
    const loan = loans.find((item) => item.loanStatus === LoanStatus.ACTIVE) ?? loans[0];
    if (!loan) {
      throw new NotFoundError('Loan account not found');
    }
    const file = await this.generateDocument(userId, loan.id, 'agreement');
    return {
      ...file,
      fileName: path.basename(file.relativePath),
    };
  }

  async listForAdmin(statusQuery?: string) {
    let status: LoanStatus | undefined;
    if (statusQuery) {
      const normalized = statusQuery.toUpperCase();
      if (!(normalized in LoanStatus)) {
        throw new BadRequestError('Invalid status filter');
      }
      status = normalized as LoanStatus;
    }

    const loans = await loanRepository.listForAdmin(status);
    return {
      items: loans.map((loan) => ({
        ...buildLoanSummary(loan),
        customer: loan.user,
        applicationNumber: loan.application?.applicationNumber ?? loan.application?.id ?? null,
      })),
      total: loans.length,
    };
  }

  async getForAdmin(loanId: string) {
    const loan = await loanRepository.getForAdmin(loanId);
    if (!loan) {
      throw new NotFoundError('Loan account not found');
    }
    return {
      ...buildLoanSummary(loan),
      customer: loan.user,
      application: loan.application
        ? {
            id: loan.application.id,
            applicationNumber:
              loan.application.applicationNumber ?? loan.application.id,
            status: loan.application.status,
            productName: loan.application.productName,
            adminRemarks: loan.application.adminRemarks ?? null,
            rejectionReason: loan.application.rejectionReason ?? null,
          }
        : null,
      schedule: buildDashboardPayload(loan).schedule,
    };
  }

  async adminUpdate(loanId: string, input: {
    loanStatus?: LoanStatus;
    remarks?: string;
    updatedBy?: string;
  }) {
    const existing = await loanRepository.findById(loanId);
    if (!existing) {
      throw new NotFoundError('Loan account not found');
    }

    const updated = await loanRepository.update(loanId, {
      loanStatus: input.loanStatus ?? existing.loanStatus,
    });

    if (input.remarks) {
      jsonDb.insert('audit_log', {
        userId: existing.userId ?? null,
        action: 'LOAN_ADMIN_UPDATE',
        entityType: 'loan_accounts',
        entityId: loanId,
        changes: {
          remarks: input.remarks,
          loanStatus: input.loanStatus ?? existing.loanStatus,
          updatedBy: input.updatedBy ?? 'admin',
        },
      });
    }

    return buildLoanSummary(updated);
  }

  /** Called after the down payment succeeds (Razorpay webhook/verify). */
  async ensureLoanAfterDownPayment(applicationId: string) {
    return this.createLoanFromApplication(applicationId, undefined);
  }

  /** Alias used by the order module when an order moves past down payment. */
  async activateFromApplication(applicationId: string, actorUserId: string) {
    return this.createLoanFromApplication(applicationId, actorUserId);
  }

  async createLoanFromApplication(applicationId: string, actorUserId?: string) {
    const application =
      jsonDb.findOne('emi_applications', { id: applicationId }) ??
      jsonDb.findOne('emiApplication', { id: applicationId });

    if (!application) {
      throw new NotFoundError('EMI Application not found');
    }

    const existing = await loanRepository.findByApplicationId(applicationId);
    if (existing) {
      return existing;
    }

    const created = await this.createLoanAccount(application);

    jsonDb.update('emi_applications', { id: applicationId }, { status: 'ACTIVE_EMI' });

    await auditLogService.log({
      userId: actorUserId ?? application.userId,
      action: 'LOAN_ACTIVATED',
      entity: 'loan_accounts',
      metadata: {
        loanAccountNumber: created.loanAccountNumber,
        applicationId,
        applicationNumber: application.applicationNumber ?? application.id,
        timestamp: new Date().toISOString(),
      },
    });

    return created;
  }

  private async createLoanAccount(application: any) {
    const loanAmount =
      toNumber(application.approvedAmount) ||
      toNumber(application.requestedAmount) ||
      toNumber(application.loanAmount) ||
      0;
    const tenure =
      toNumber(application.approvedTenure) ||
      toNumber(application.requestedTenure) ||
      toNumber(application.tenure) ||
      6;
    const interestRate = toNumber(application.interestRate) || 12.5;
    const processingFee = toNumber(application.processingFee) || 0;
    const requestedEmi =
      toNumber(application.monthlyEmi) ||
      toNumber(application.estimatedMonthlyEmi) ||
      toNumber(application.monthly_amount) ||
      0;
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const schedulePlan = buildEmiSchedule({
      principal: loanAmount,
      annualRatePercent: interestRate,
      tenureMonths: tenure,
      startDate,
      emiAmount: requestedEmi || undefined,
    });

    const accountNo = `LN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const loanEndDate = addMonths(startDate, tenure);

    return loanRepository.createWithSchedule({
      loanAccountNumber: accountNo,
      userId: application.userId,
      applicationId: application.id,
      productId: application.productId,
      loanAmount,
      interestRate,
      processingFee,
      loanTenure: tenure,
      emiAmount: schedulePlan.emiAmount,
      totalInterest: schedulePlan.totalInterest,
      totalPayable: schedulePlan.totalPayable,
      outstandingAmount: schedulePlan.totalPayable,
      loanStartDate: startDate,
      loanEndDate,
      nextEmiDueDate: schedulePlan.rows[0]?.dueDate ?? addMonths(startDate, 1),
      schedule: schedulePlan.rows,
    });
  }

  async generateDocument(userId: string, loanId: string, type: 'statement' | 'agreement') {
    const loan = await loanRepository.findByIdForUser(loanId, userId);
    if (!loan) {
      throw new NotFoundError('Loan account not found');
    }

    const folder = type === 'statement' ? 'statements' : 'agreements';
    const fileName = `${type}_${loan.loanAccountNumber}_${Date.now()}.pdf`;
    const storageDir = path.join(process.cwd(), 'storage', folder);

    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const absolutePath = path.join(storageDir, fileName);
    const relativePath = path.join('storage', folder, fileName);

    const dashboard = buildDashboardPayload(loan);
    const summary = dashboard.loan;

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(absolutePath);
      doc.pipe(stream);

      doc.fontSize(20).fillColor('#0A2E6F').text(
        type === 'statement' ? 'LoanEx Loan Statement' : 'LoanEx Loan Agreement',
      );
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#111827');
      doc.text(`Loan Account: ${summary.loanAccountNumber}`);
      doc.text(`Application: ${summary.applicationNumber}`);
      doc.text(`Product: ${summary.productName ?? summary.productId}`);
      doc.text(`Loan Amount: INR ${summary.loanAmount.toFixed(2)}`);
      doc.text(`Interest Rate: ${summary.interestRate}%`);
      doc.text(`Tenure: ${summary.loanTenure} months`);
      doc.text(`EMI Amount: INR ${summary.emiAmount.toFixed(2)}`);
      doc.text(`Total Payable: INR ${summary.totalPayable.toFixed(2)}`);
      doc.text(`Outstanding: INR ${dashboard.summary.outstandingBalance.toFixed(2)}`);
      doc.text(`Status: ${summary.loanStatus}`);

      if (type === 'statement') {
        doc.moveDown();
        doc.text('Recent payments:');
        for (const payment of dashboard.recentPayments) {
          doc.text(
            `EMI #${payment.emiNumber} | ${payment.amount.toFixed(2)} | ${payment.status}`,
          );
        }
      } else {
        doc.moveDown();
        doc
          .fontSize(10)
          .fillColor('#6B7280')
          .text(
            'Terms & Conditions: This agreement constitutes a binding contract between the borrower and LoanEx NBFC Partner.',
          );
      }

      doc.end();
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });

    return { absolutePath, relativePath };
  }
}

export const loanService = new LoanService();
