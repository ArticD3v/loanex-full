import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { EmiPaymentStatus, PaymentStatus } from '@prisma/client';
import { NotFoundError } from '../../../common/errors/app-error';
import { ensureWritableStorageDir } from '../../../common/utils/writable-storage';
import { auditLogService } from '../../verification/service/audit-log.service';
import { resolveProductImage } from '../../../common/utils/product-assets';
import {
  emiHistoryRepository,
  type HistoryPayment,
  type PaymentTransaction,
} from '../repository/emi-history.repository';

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function mapRow(payment: HistoryPayment) {
  const schedule = payment.emiSchedule;
  const emiAmount = toNumber(schedule?.emiAmount);
  const paidAmount = toNumber(payment.amount);
  const principal = toNumber(schedule?.principalAmount);
  const interest = toNumber(schedule?.interestAmount);
  const penalty = round2(Math.max(0, paidAmount - emiAmount));

  return {
    id: payment.id,
    emiId: schedule?.id ?? null,
    emiNumber: schedule?.emiNumber ?? null,
    dueDate: schedule?.dueDate ?? null,
    paidDate: schedule?.paidAt ?? (payment.paymentStatus === PaymentStatus.SUCCESS ? payment.updatedAt : null),
    amount: paidAmount,
    principal,
    interest,
    penalty,
    paymentMethod: 'Razorpay',
    transactionId: payment.razorpayPaymentId ?? payment.razorpayOrderId,
    razorpayOrderId: payment.razorpayOrderId,
    razorpayPaymentId: payment.razorpayPaymentId,
    status: payment.paymentStatus,
    paymentType: payment.paymentType,
    receiptAvailable:
      payment.paymentStatus === PaymentStatus.SUCCESS && Boolean(schedule?.paidAt || payment.receiptPath),
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

function buildLoanStats(loan: {
  loanAmount: { toString(): string } | number;
  totalInterest: { toString(): string } | number;
  totalPayable: { toString(): string } | number;
  outstandingAmount: { toString(): string } | number;
  paidAmount: { toString(): string } | number;
  schedule: Array<{
    paymentStatus: EmiPaymentStatus;
    principalAmount: { toString(): string } | number;
    interestAmount: { toString(): string } | number;
    emiAmount: { toString(): string } | number;
    dueDate: Date;
  }>;
}) {
  const asOf = new Date();
  const paid = loan.schedule.filter((row) => row.paymentStatus === EmiPaymentStatus.PAID);
  const unpaid = loan.schedule.filter((row) => row.paymentStatus !== EmiPaymentStatus.PAID);
  const overdue = unpaid.filter(
    (row) => row.paymentStatus === EmiPaymentStatus.OVERDUE || row.dueDate < asOf,
  );
  const pending = unpaid.filter((row) => !overdue.includes(row));

  const principalPaid = round2(paid.reduce((sum, row) => sum + toNumber(row.principalAmount), 0));
  const interestPaid = round2(paid.reduce((sum, row) => sum + toNumber(row.interestAmount), 0));
  const loanAmount = toNumber(loan.loanAmount);
  const completionPercent =
    loanAmount <= 0 ? 0 : round2(Math.min(100, (principalPaid / loanAmount) * 100));

  return {
    totalEmis: loan.schedule.length,
    paidEmis: paid.length,
    pendingEmis: pending.length,
    overdueEmis: overdue.length,
    principalPaid,
    interestPaid,
    outstandingAmount: toNumber(loan.outstandingAmount),
    totalPaid: toNumber(loan.paidAmount) || round2(principalPaid + interestPaid),
    totalLoanAmount: loanAmount,
    totalInterest: toNumber(loan.totalInterest),
    totalPayable: toNumber(loan.totalPayable),
    loanCompletionPercent: completionPercent,
  };
}

export class EmiHistoryService {
  async getPaymentHistory(
    userId: string,
    query: {
      status?: string;
      paymentType?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    },
  ) {
    const loan = await emiHistoryRepository.findLatestLoanForUser(userId);
    if (!loan) throw new NotFoundError('No loan found for this account.');

    const status = this.parseStatus(query.status);
    const paymentType = this.parsePaymentType(query.paymentType);

    const payments = await emiHistoryRepository.listPayments({
      userId,
      status,
      paymentType,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(`${query.dateTo}T23:59:59.999Z`) : undefined,
      search: query.search,
    });

    const stats = buildLoanStats(loan);
    const items = payments.map(mapRow);

    await auditLogService.log({
      userId,
      action: 'PAYMENT_HISTORY_VIEWED',
      entity: 'payment_transactions',
      metadata: {
        loanAccountNumber: loan.loanAccountNumber,
        count: items.length,
        filters: query,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      summary: {
        loanAccountNumber: loan.loanAccountNumber,
        applicationNumber: loan.application.id,
        totalLoanAmount: stats.totalLoanAmount,
        totalPaid: stats.totalPaid,
        outstandingBalance: stats.outstandingAmount,
        totalEmis: stats.totalEmis,
        paidEmis: stats.paidEmis,
        pendingEmis: stats.pendingEmis,
        overdueEmis: stats.overdueEmis,
      },
      items,
      total: items.length,
    };
  }

  async getPaymentById(paymentId: string, userId: string) {
    const payment = await emiHistoryRepository.findPaymentByIdForUser(paymentId, userId);
    if (!payment) throw new NotFoundError('Payment not found.');
    return mapRow(payment as HistoryPayment);
  }

  async getStatement(userId: string) {
    const loan = await emiHistoryRepository.findLatestLoanForUser(userId);
    if (!loan) throw new NotFoundError('No loan found for this account.');

    const stats = buildLoanStats(loan);
    const payments = await emiHistoryRepository.listPayments({
      userId,
      status: PaymentStatus.SUCCESS,
    });

    return {
      loan: {
        id: loan.id,
        loanAccountNumber: loan.loanAccountNumber,
        applicationNumber: loan.application.id,
        productId: loan.productId,
        productName: loan.application.productName,
        productImage: resolveProductImage(loan.productId),
        loanAmount: toNumber(loan.loanAmount),
        interestRate: toNumber(loan.interestRate),
        processingFee: toNumber(loan.processingFee),
        loanTenure: loan.loanTenure,
        emiAmount: toNumber(loan.emiAmount),
        loanStatus: loan.loanStatus,
        loanStartDate: loan.loanStartDate,
        loanEndDate: loan.loanEndDate,
        nextEmiDueDate: loan.nextEmiDueDate,
        lastPaymentDate: loan.lastPaymentDate,
      },
      interestSummary: {
        totalInterest: stats.totalInterest,
        interestPaid: stats.interestPaid,
        interestRemaining: round2(Math.max(0, stats.totalInterest - stats.interestPaid)),
      },
      principalSummary: {
        totalPrincipal: stats.totalLoanAmount,
        principalPaid: stats.principalPaid,
        principalRemaining: round2(Math.max(0, stats.totalLoanAmount - stats.principalPaid)),
      },
      outstandingAmount: stats.outstandingAmount,
      totalPayable: stats.totalPayable,
      totalPaid: stats.totalPaid,
      loanCompletionPercent: stats.loanCompletionPercent,
      emis: {
        total: stats.totalEmis,
        paid: stats.paidEmis,
        pending: stats.pendingEmis,
        overdue: stats.overdueEmis,
      },
      recentPayments: payments.slice(0, 12).map(mapRow),
    };
  }

  async getStatementPdf(userId: string) {
    const statement = await this.getStatement(userId);
    const buffer = await this.buildStatementPdfBuffer(statement);

    await auditLogService.log({
      userId,
      action: 'STATEMENT_DOWNLOADED',
      entity: 'loan_accounts',
      metadata: {
        loanAccountNumber: statement.loan.loanAccountNumber,
        format: 'pdf',
        timestamp: new Date().toISOString(),
      },
    });

    return {
      buffer,
      fileName: `${statement.loan.loanAccountNumber}-statement.pdf`,
    };
  }

  async exportPaymentHistoryPdf(userId: string, query: Record<string, string | undefined>) {
    const history = await this.getPaymentHistory(userId, query);
    const buffer = await this.buildHistoryPdfBuffer(history);

    await auditLogService.log({
      userId,
      action: 'STATEMENT_DOWNLOADED',
      entity: 'payment_transactions',
      metadata: {
        loanAccountNumber: history.summary.loanAccountNumber,
        format: 'payment-history-pdf',
        count: history.total,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      buffer,
      fileName: `${history.summary.loanAccountNumber}-payment-history.pdf`,
    };
  }

  async exportPaymentHistoryExcel(userId: string, query: Record<string, string | undefined>) {
    const history = await this.getPaymentHistory(userId, query);
    const buffer = await this.buildHistoryExcelBuffer(history);

    await auditLogService.log({
      userId,
      action: 'STATEMENT_DOWNLOADED',
      entity: 'payment_transactions',
      metadata: {
        loanAccountNumber: history.summary.loanAccountNumber,
        format: 'payment-history-excel',
        count: history.total,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      buffer,
      fileName: `${history.summary.loanAccountNumber}-payment-history.xlsx`,
    };
  }

  async getReceipt(paymentId: string, userId: string) {
    const payment = await emiHistoryRepository.findPaymentByIdForUser(paymentId, userId);
    if (!payment) throw new NotFoundError('Payment not found.');
    if (payment.paymentStatus !== PaymentStatus.SUCCESS) {
      throw new NotFoundError('Receipt is available only for successful payments.');
    }

    let buffer: Buffer | null = null;
    if (payment.receiptPath) {
      const candidate = path.isAbsolute(payment.receiptPath)
        ? payment.receiptPath
        : path.resolve(process.cwd(), payment.receiptPath);
      if (fs.existsSync(candidate)) {
        buffer = fs.readFileSync(candidate);
      }
    }

    if (!buffer) {
      buffer = await this.buildPaymentReceiptBuffer(payment);
    }

    await auditLogService.log({
      userId,
      action: 'RECEIPT_DOWNLOADED',
      entity: 'payment_transactions',
      metadata: {
        paymentId: payment.id,
        transactionId: payment.razorpayPaymentId,
        timestamp: new Date().toISOString(),
      },
    });

    const emiNumber = payment.emiSchedule?.emiNumber ?? 'emi';
    return {
      buffer,
      fileName: `payment-${emiNumber}-receipt.pdf`,
    };
  }

  private parseStatus(value?: string): PaymentStatus | undefined {
    if (!value) return undefined;
    const upper = value.toUpperCase();
    if (Object.values(PaymentStatus).includes(upper as PaymentStatus)) {
      return upper as PaymentStatus;
    }
    return undefined;
  }

  private parsePaymentType(value?: string) {
    if (!value) return undefined;
    const upper = value.toUpperCase();
    if (upper === 'EMI' || upper === 'DOWN_PAYMENT') return upper as 'EMI' | 'DOWN_PAYMENT';
    return undefined;
  }

  private buildStatementPdfBuffer(
    statement: Awaited<ReturnType<EmiHistoryService['getStatement']>>,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).fillColor('#0A2E6F').text('LoanEx Loan Statement');
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#111827');
      doc.text(`Loan Account: ${statement.loan.loanAccountNumber}`);
      doc.text(`Application: ${statement.loan.applicationNumber}`);
      doc.text(`Product: ${statement.loan.productName ?? statement.loan.productId}`);
      doc.text(`Loan Amount: INR ${statement.loan.loanAmount.toFixed(2)}`);
      doc.text(`Interest Rate: ${statement.loan.interestRate}%`);
      doc.text(`Tenure: ${statement.loan.loanTenure} months`);
      doc.moveDown();
      doc.text(`Principal Paid: INR ${statement.principalSummary.principalPaid.toFixed(2)}`);
      doc.text(`Interest Paid: INR ${statement.interestSummary.interestPaid.toFixed(2)}`);
      doc.text(`Outstanding: INR ${statement.outstandingAmount.toFixed(2)}`);
      doc.text(`Completion: ${statement.loanCompletionPercent}%`);
      doc.moveDown();
      doc.fontSize(10).fillColor('#6B7280').text('System-generated loan statement from LoanEx.');
      doc.end();
    });
  }

  private buildHistoryPdfBuffer(
    history: Awaited<ReturnType<EmiHistoryService['getPaymentHistory']>>,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).fillColor('#0A2E6F').text('LoanEx Payment History');
      doc.moveDown(0.4);
      doc.fontSize(11).fillColor('#111827');
      doc.text(`Loan Account: ${history.summary.loanAccountNumber}`);
      doc.text(`Total Paid: INR ${history.summary.totalPaid.toFixed(2)}`);
      doc.text(`Outstanding: INR ${history.summary.outstandingBalance.toFixed(2)}`);
      doc.moveDown();

      for (const item of history.items) {
        doc
          .fontSize(9)
          .text(
            `EMI #${item.emiNumber ?? '—'} | ${item.status} | INR ${item.amount.toFixed(2)} | Txn ${item.transactionId ?? '—'}`,
          );
      }

      doc.moveDown();
      doc.fontSize(10).fillColor('#6B7280').text('System-generated payment history from LoanEx.');
      doc.end();
    });
  }

  private async buildHistoryExcelBuffer(
    history: Awaited<ReturnType<EmiHistoryService['getPaymentHistory']>>,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LoanEx';
    const sheet = workbook.addWorksheet('Payment History');

    sheet.columns = [
      { header: 'EMI Number', key: 'emiNumber', width: 12 },
      { header: 'Due Date', key: 'dueDate', width: 14 },
      { header: 'Paid Date', key: 'paidDate', width: 14 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Principal', key: 'principal', width: 12 },
      { header: 'Interest', key: 'interest', width: 12 },
      { header: 'Penalty', key: 'penalty', width: 12 },
      { header: 'Payment Method', key: 'paymentMethod', width: 16 },
      { header: 'Transaction ID', key: 'transactionId', width: 28 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    for (const item of history.items) {
      sheet.addRow({
        emiNumber: item.emiNumber ?? '',
        dueDate: item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : '',
        paidDate: item.paidDate ? new Date(item.paidDate).toISOString().slice(0, 10) : '',
        amount: item.amount,
        principal: item.principal,
        interest: item.interest,
        penalty: item.penalty,
        paymentMethod: item.paymentMethod,
        transactionId: item.transactionId ?? '',
        status: item.status,
      });
    }

    sheet.getRow(1).font = { bold: true, color: { argb: 'FF0A2E6F' } };

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Best-effort local cache; never required for the download response.
    try {
      const dir = ensureWritableStorageDir('statements');
      const fileName = `${history.summary.loanAccountNumber}-payment-history.xlsx`;
      fs.writeFileSync(path.join(dir, fileName), buffer);
    } catch (err) {
      console.warn('[EMI History] Excel cache write skipped:', err);
    }

    return buffer;
  }

  private async writePaymentReceipt(payment: PaymentTransaction & {
    emiSchedule?: { emiNumber: number; loanAccount?: { loanAccountNumber: string; application?: { id: string; applicationNumber: string; productName: string | null } } } | null;
  }): Promise<string> {
    const dir = ensureWritableStorageDir('emi-receipts');
    const emiNumber = payment.emiSchedule?.emiNumber ?? 0;
    const loanNumber = payment.emiSchedule?.loanAccount?.loanAccountNumber ?? 'loan';
    const fileName = `${loanNumber}-payment-${payment.id.slice(0, 8)}-receipt.pdf`;
    const absolutePath = path.join(dir, fileName);
    const buffer = await this.buildPaymentReceiptBuffer(payment as any);
    fs.writeFileSync(absolutePath, buffer);
    return absolutePath;
  }

  private buildPaymentReceiptBuffer(payment: PaymentTransaction & {
    emiSchedule?: { emiNumber: number; loanAccount?: { loanAccountNumber: string; application?: { id?: string; applicationNumber?: string; productName?: string | null } } } | null;
  }): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const emiNumber = payment.emiSchedule?.emiNumber ?? 0;
      const loanNumber = payment.emiSchedule?.loanAccount?.loanAccountNumber ?? 'loan';
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).fillColor('#0A2E6F').text('LoanEx EMI Payment Receipt');
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#111827');
      doc.text(`Loan Account: ${loanNumber}`);
      doc.text(
        `Application: ${payment.emiSchedule?.loanAccount?.application?.id ?? '—'}`,
      );
      doc.text(`EMI Number: #${emiNumber}`);
      doc.text(`Amount: INR ${toNumber(payment.amount).toFixed(2)}`);
      doc.text(`Transaction ID: ${payment.razorpayPaymentId ?? payment.razorpayOrderId}`);
      doc.text(`Status: ${payment.paymentStatus}`);
      doc.moveDown();
      doc.fontSize(10).fillColor('#6B7280').text('System-generated receipt from LoanEx.');
      doc.end();
    });
  }
}

export const emiHistoryService = new EmiHistoryService();
