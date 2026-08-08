import { EmiPaymentStatus, LoanStatus } from '@prisma/client';
import { resolveProductImage } from '../../../common/utils/product-assets';
import type { LoanWithRelations } from '../repository/loan.repository';

type EmiSchedule = Record<string, any>;

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function productImagePath(productId: string): string {
  const map: Record<string, string> = {
    'smartphone-iphone-15': 'https://images.unsplash.com/photo-1695048133142-1a204986d903?w=800&q=80',
    'laptop-hp-pavilion-15': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80',
    'smart-tv-samsung-55': 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80',
    'refrigerator-lg-260': 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=800&q=80',
    'washing-machine-bosch-7kg': 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&q=80',
    'ac-voltas-1-5ton': 'https://images.unsplash.com/photo-1631545806606-867b4070886a?w=800&q=80',
    'tablet-samsung-s9': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80',
    'smartwatch-apple-series-9': 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=800&q=80',
  };
  return map[productId] ?? 'assets/images/products/laptop.png';
}

function effectiveStatus(row: EmiSchedule, asOf: Date): EmiPaymentStatus {
  if (row.paymentStatus === EmiPaymentStatus.PAID || row.paymentStatus === EmiPaymentStatus.FAILED) {
    return row.paymentStatus;
  }
  const due = toDate(row.dueDate);
  if (due && due < asOf && row.paymentStatus === EmiPaymentStatus.PENDING) {
    return EmiPaymentStatus.OVERDUE;
  }
  return row.paymentStatus ?? EmiPaymentStatus.PENDING;
}

function daysUntil(date: Date | string | null | undefined, asOf: Date): number {
  const due = toDate(date);
  if (!due) return 0;
  const ms = due.getTime() - asOf.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function buildLoanSummary(loan: LoanWithRelations) {
  const app = loan.application as any;
  return {
    id: loan.id,
    loanAccountNumber: loan.loanAccountNumber,
    applicationId: loan.applicationId,
    applicationNumber: app?.applicationNumber ?? app?.id ?? null,
    productId: loan.productId,
    productName: app?.productName ?? 'Product',
    productImage: resolveProductImage(loan.productId, app?.productImage) || productImagePath(loan.productId),
    productPrice: toNumber(app?.sellingPrice),
    loanAmount: toNumber(loan.loanAmount),
    downPaymentPaid:
      toNumber(app?.approvedDownPayment) ||
      toNumber(app?.requestedDownPayment) ||
      toNumber(app?.downPayment) ||
      0,
    processingFee: toNumber(loan.processingFee),
    interestRate: toNumber(loan.interestRate),
    loanTenure: loan.loanTenure,
    emiAmount: toNumber(loan.emiAmount),
    totalInterest: toNumber(loan.totalInterest),
    totalPayable: toNumber(loan.totalPayable),
    outstandingAmount: toNumber(loan.outstandingAmount),
    paidAmount: toNumber(loan.paidAmount),
    nextEmiDueDate: toDate(loan.nextEmiDueDate as any) ?? loan.nextEmiDueDate,
    lastPaymentDate: toDate(loan.lastPaymentDate as any) ?? loan.lastPaymentDate,
    loanStatus: loan.loanStatus,
    loanStartDate: toDate(loan.loanStartDate as any) ?? loan.loanStartDate,
    loanEndDate: toDate(loan.loanEndDate as any) ?? loan.loanEndDate,
    createdAt: toDate(loan.createdAt as any) ?? loan.createdAt,
    updatedAt: toDate(loan.updatedAt as any) ?? loan.updatedAt,
  };
}

export function buildDashboardPayload(loan: LoanWithRelations, asOf: Date = new Date()) {
  const schedule = (loan.schedule ?? []).map((row) => {
    const status = effectiveStatus(row, asOf);
    const dueDate = toDate(row.dueDate as any) ?? row.dueDate;
    const paidAt = toDate(row.paidAt as any) ?? row.paidAt;
    return {
      id: row.id,
      emiNumber: row.emiNumber,
      dueDate,
      principalAmount: toNumber(row.principalAmount),
      interestAmount: toNumber(row.interestAmount),
      emiAmount: toNumber(row.emiAmount),
      remainingBalance: toNumber(row.remainingBalance),
      paymentStatus: status,
      paidAt,
    };
  });

  const paid = schedule.filter((row) => row.paymentStatus === EmiPaymentStatus.PAID);
  const unpaid = schedule.filter((row) => row.paymentStatus !== EmiPaymentStatus.PAID);
  const nextEmi = unpaid[0] ?? null;

  const principalPaid = round2(paid.reduce((sum, row) => sum + row.principalAmount, 0));
  const interestPaid = round2(paid.reduce((sum, row) => sum + row.interestAmount, 0));
  const outstandingBalance = round2(unpaid.reduce((sum, row) => sum + row.emiAmount, 0));
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
          daysRemaining: daysUntil(nextEmi.dueDate as any, asOf),
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
