import {
  EmiPaymentStatus,
  LoanStatus,
  PaymentStatus,
  PaymentType,
} from '@prisma/client';
import { jsonDb } from '../../../config/json-db';

type EmiApplication = Record<string, any>;
type EmiSchedule = Record<string, any>;
type LoanAccount = Record<string, any>;
type PaymentTransaction = Record<string, any>;
type User = Record<string, any>;

export type EmiScheduleWithLoan = EmiSchedule & {
  loanAccount: LoanAccount & {
    application: EmiApplication;
    user?: Pick<User, 'id' | 'fullName' | 'email' | 'mobile'> | null;
  };
  paymentTransaction?: PaymentTransaction | null;
};

export class EmiPaymentRepository {
  private _resolveScheduleRelations(schedule: any) {
    if (!schedule) return null;
    const loanAccount = jsonDb.findOne('loanAccount', { id: schedule.loanAccountId });
    if (!loanAccount) return { ...schedule, loanAccount: null, paymentTransaction: null };

    const application = jsonDb.findOne('emi_applications', { id: loanAccount.applicationId });
    const user = jsonDb.findOne('users', { id: loanAccount.userId });
    const schedules = jsonDb.findMany('emi_schedules', { loanAccountId: loanAccount.id })
      .sort((a: any, b: any) => a.emiNumber - b.emiNumber);

    const paymentTransaction = jsonDb.findOne('paymentTransaction', { emiScheduleId: schedule.id });

    return {
      ...schedule,
      loanAccount: {
        ...loanAccount,
        application,
        user: user ? { id: user.id, fullName: user.fullName, email: user.email, mobile: user.phone || user.mobile } : null,
        schedule: schedules,
      },
      paymentTransaction: paymentTransaction || null,
    };
  }

  findScheduleByIdForUser(emiId: string, userId: string) {
    const schedule = jsonDb.findOne('emi_schedules', { id: emiId });
    if (!schedule) return null;
    const loanAccount = jsonDb.findOne('loanAccount', { id: schedule.loanAccountId });
    if (!loanAccount || loanAccount.userId !== userId) return null;

    return this._resolveScheduleRelations(schedule);
  }

  findScheduleById(emiId: string) {
    const schedule = jsonDb.findOne('emi_schedules', { id: emiId });
    return this._resolveScheduleRelations(schedule);
  }

  findSuccessByEmiId(emiScheduleId: string) {
    return jsonDb.findOne('paymentTransaction', {
      emiScheduleId,
      paymentType: PaymentType.EMI,
      paymentStatus: PaymentStatus.SUCCESS,
    });
  }

  findByRazorpayOrderId(razorpayOrderId: string) {
    const payment = jsonDb.findOne('paymentTransaction', { razorpayOrderId });
    if (!payment) return null;
    const emiSchedule = jsonDb.findOne('emi_schedules', { id: payment.emiScheduleId });
    if (emiSchedule) {
      const loanAccount = jsonDb.findOne('loanAccount', { id: emiSchedule.loanAccountId });
      if (loanAccount) {
        const application = jsonDb.findOne('emi_applications', { id: loanAccount.applicationId });
        const schedules = jsonDb.findMany('emi_schedules', { loanAccountId: loanAccount.id })
          .sort((a: any, b: any) => a.emiNumber - b.emiNumber);
        
        return {
          ...payment,
          emiSchedule: {
            ...emiSchedule,
            loanAccount: {
              ...loanAccount,
              application,
              schedule: schedules
            }
          }
        };
      }
      return { ...payment, emiSchedule };
    }
    return payment;
  }

  createEmiTransaction(input: {
    applicationId: string;
    userId: string;
    emiScheduleId: string;
    razorpayOrderId: string;
    amount: number;
  }) {
    return jsonDb.upsert('paymentTransaction', 
      { emiScheduleId: input.emiScheduleId }, 
      {
        razorpayOrderId: input.razorpayOrderId,
        amount: input.amount,
        paymentStatus: PaymentStatus.PENDING,
        razorpayPaymentId: null,
        razorpaySignature: null,
      }, 
      {
        applicationId: input.applicationId,
        userId: input.userId,
        emiScheduleId: input.emiScheduleId,
        razorpayOrderId: input.razorpayOrderId,
        amount: input.amount,
        paymentStatus: PaymentStatus.PENDING,
        paymentType: PaymentType.EMI,
      }
    );
  }

  listEmiPaymentsForLoan(loanAccountId: string) {
    const schedules = jsonDb.findMany('emi_schedules', { loanAccountId });
    const scheduleIds = schedules.map((s: any) => s.id);
    const payments = jsonDb.findMany('paymentTransaction', { paymentType: PaymentType.EMI })
      .filter((p: any) => scheduleIds.includes(p.emiScheduleId))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return payments.map((p: any) => ({
      ...p,
      emiSchedule: schedules.find((s: any) => s.id === p.emiScheduleId)
    }));
  }

  async completeEmiPayment(input: {
    paymentId: string;
    emiScheduleId: string;
    loanAccountId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    paidAmount: number;
    receiptPath?: string | null;
  }) {
    jsonDb.update('paymentTransaction', { id: input.paymentId }, {
      paymentStatus: PaymentStatus.SUCCESS,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
      receiptPath: input.receiptPath ?? undefined,
    });
    const payment = jsonDb.findOne('paymentTransaction', { id: input.paymentId });

    jsonDb.update('emi_schedules', { id: input.emiScheduleId }, {
      paymentStatus: EmiPaymentStatus.PAID,
      paidAmount: input.paidAmount,
      paidAt: new Date().toISOString(),
      transactionId: input.razorpayPaymentId,
    });

    const freshSchedule = jsonDb.findMany('emi_schedules', { loanAccountId: input.loanAccountId })
      .sort((a: any, b: any) => a.emiNumber - b.emiNumber);

    const remaining = freshSchedule.filter((row: any) => row.paymentStatus !== EmiPaymentStatus.PAID);
    const paidRows = freshSchedule.filter((row: any) => row.paymentStatus === EmiPaymentStatus.PAID);
    const outstandingAmount = remaining.reduce((sum: number, row: any) => sum + Number(row.emiAmount), 0);
    const paidAmount = paidRows.reduce(
      (sum: number, row: any) => sum + Number(row.paidAmount ?? row.emiAmount),
      0,
    );
    const nextDue = remaining[0]?.dueDate ?? null;

    jsonDb.update('loanAccount', { id: input.loanAccountId }, {
      outstandingAmount,
      paidAmount,
      nextEmiDueDate: nextDue,
      lastPaymentDate: new Date().toISOString(),
    });

    if (remaining.length === 0) {
      jsonDb.update('loanAccount', { id: input.loanAccountId }, { loanStatus: LoanStatus.CLOSED });
    }

    return {
      payment,
      unpaidCount: remaining.length,
      outstandingAmount,
      paidAmount,
      nextEmiDueDate: nextDue,
    };
  }

  markFailed(paymentId: string) {
    jsonDb.update('paymentTransaction', { id: paymentId }, { paymentStatus: PaymentStatus.FAILED });
    return jsonDb.findOne('paymentTransaction', { id: paymentId });
  }

  updateReceiptPath(paymentId: string, receiptPath: string) {
    jsonDb.update('paymentTransaction', { id: paymentId }, { receiptPath });
    return jsonDb.findOne('paymentTransaction', { id: paymentId });
  }
}

export const emiPaymentRepository = new EmiPaymentRepository();
export { PaymentStatus, PaymentType, EmiPaymentStatus };
