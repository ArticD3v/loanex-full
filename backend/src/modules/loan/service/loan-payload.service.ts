import { EmiPaymentStatus, LoanStatus } from '@prisma/client';
import { resolveProductImage } from '../../../common/utils/product-assets';
import type { LoanWithRelations } from '../repository/loan.repository';

type EmiSchedule = Record<string, any>;

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function effectiveStatus(row: EmiSchedule, asOf: Date): EmiPaymentStatus {
  if (row.paymentStatus === EmiPaymentStatus.PAID || row.paymentStatus === EmiPaymentStatus.FAILED) {
    return row.paymentStatus;
  }
  if (row.dueDate < asOf && row.paymentStatus === EmiPaymentStatus.PENDING) {
    return EmiPaymentStatus.OVERDUE;
  }
  return row.paymentStatus;
}

function daysUntil(date: Date, asOf: Date): number {
  const ms = date.getTime() - asOf.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function buildLoanSummary(loan: LoanWithRelations) {
  const app = loan.application;
  return {
    id: loan.id,
    loanAccountNumber: loan.loanAccountNumber,
    applicationId: loan.applicationId,
    applicationNumber: app.applicationNumber ?? app.id,
    productId: loan.productId,
    productName: app.productName,
    productImage: resolveProductImage(loan.productId, app.productImage),
    productPrice: toNumber(app.sellingPrice),
    loanAmount: toNumber(loan.loanAmount),
    downPaymentPaid:
      toNumber(app.approvedDownPayment) || toNumber(app.requestedDownPayment) || toNumber(app.downPayment) || 0,
    processingFee: toNumber(loan.processingFee),
    interestRate: toNumber(loan.interestRate),
    loanTenure: loan.loanTenure,
    emiAmount: toNumber(loan.emiAmount),
    totalInterest: toNumber(loan.totalInterest),
    totalPayable: toNumber(loan.totalPayable),
    outstandingAmount: toNumber(loan.outstandingAmount),
    paidAmount: toNumber(loan.paidAmount),
    nextEmiDueDate: loan.nextEmiDueDate,
    lastPaymentDate: loan.lastPaymentDate,
    loanStatus: loan.loanStatus,
    loanStartDate: loan.loanStartDate,
    loanEndDate: loan.loanEndDate,
    createdAt: loan.createdAt,
    updatedAt: loan.updatedAt,
  };
}

export function buildDashboardPayload(loan: LoanWithRelations, asOf: Date = new Date()) {
  const schedule = loan.schedule.map((row) => {
    const status = effectiveStatus(row, asOf);
    return {
      id: row.id,
      emiNumber: row.emiNumber,
      dueDate: row.dueDate,
      principalAmount: toNumber(row.principalAmount),
      interestAmount: toNumber(row.interestAmount),
      emiAmount: toNumber(row.emiAmount),
      remainingBalance: toNumber(row.remainingBalance),
      paymentStatus: status,
      paidAt: row.paidAt,
    };
  });

  const paid = schedule.filter((row) => row.paymentStatus === EmiPaymentStatus.PAID);
  const unpaid = schedule.filter((row) => row.paymentStatus !== EmiPaymentStatus.PAID);
  const nextEmi = unpaid[0] ?? null;

  const principalPaid = round2(paid.reduce((sum, row) => sum + row.principalAmount, 0));
  const interestPaid = round2(paid.reduce((sum, row) => sum + row.interestAmount, 0));
  const outstandingBalance = round2(
    unpaid.reduce((sum, row) => sum + row.emiAmount, 0),
  );
  const loanAmount = toNumber(loan.loanAmount);
  const completionPercent =
    loanAmount <= 0 ? 0 : round2(Math.min(100, (principalPaid / loanAmount) * 100));

  return {
    loan: buildLoanSummary(loan),
    summary: {
      outstandingBalance,
      totalLoanAmount: loanAmount,
      totalInterest: toNumber(loan.totalInterest),
      totalPayable: toNumber(loan.totalPayable),
      emisPaid: paid.length,
      remainingEmis: unpaid.length,
      nextEmiAmount: nextEmi?.emiAmount ?? null,
      nextEmiDueDate: nextEmi?.dueDate ?? null,
      principalPaid,
      interestPaid,
      loanCompletionPercent: completionPercent,
    },
    nextEmi: nextEmi
      ? {
          id: nextEmi.id,
          emiNumber: nextEmi.emiNumber,
          amount: nextEmi.emiAmount,
          dueDate: nextEmi.dueDate,
          daysRemaining: daysUntil(nextEmi.dueDate, asOf),
          status: nextEmi.paymentStatus,
        }
      : null,
    recentPayments: paid
      .slice()
      .reverse()
      .slice(0, 10)
      .map((row) => ({
        emiId: row.id,
        emiNumber: row.emiNumber,
        dueDate: row.dueDate,
        paidDate: row.paidAt,
        amount: row.emiAmount,
        status: row.paymentStatus,
        receiptAvailable: Boolean(row.paidAt),
      })),
    schedule,
    canPayEmi: loan.loanStatus === LoanStatus.ACTIVE && Boolean(nextEmi),
  };
}

export function buildPaymentHistoryPayload(loan: LoanWithRelations, asOf: Date = new Date()) {
  const dashboard = buildDashboardPayload(loan, asOf);
  return {
    loanAccountNumber: loan.loanAccountNumber,
    items: dashboard.recentPayments,
  };
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
