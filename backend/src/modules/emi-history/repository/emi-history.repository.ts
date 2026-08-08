import {
  EmiPaymentStatus,
  LoanStatus,
  PaymentStatus,
  PaymentType,
  Prisma,
} from '@prisma/client';
import { jsonDb } from '../../../config/json-db';

export type EmiApplication = Record<string, any>;
export type EmiSchedule = Record<string, any>;
export type LoanAccount = Record<string, any>;
export type PaymentTransaction = Record<string, any>;

export type HistoryPayment = PaymentTransaction & {
  emiSchedule: (EmiSchedule & {
    loanAccount: LoanAccount & { application: EmiApplication };
  }) | null;
};

export type HistoryFilters = {
  userId: string;
  status?: PaymentStatus;
  paymentType?: PaymentType;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
};

export class EmiHistoryRepository {
  private _resolveLoanAccountRelations(loanAccount: any) {
    if (!loanAccount) return null;
    const application = jsonDb.findOne('emi_applications', { id: loanAccount.applicationId });
    const schedule = jsonDb.findMany('emi_schedules', { loanAccountId: loanAccount.id })
      .sort((a: any, b: any) => a.emiNumber - b.emiNumber);
    
    return {
      ...loanAccount,
      application,
      schedule,
    };
  }

  findActiveLoanForUser(userId: string) {
    const loans = jsonDb.findMany('loanAccount', { userId, loanStatus: LoanStatus.ACTIVE })
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const latestLoan = loans[0];
    return this._resolveLoanAccountRelations(latestLoan);
  }

  findLatestLoanForUser(userId: string) {
    const loans = jsonDb.findMany('loanAccount', { userId })
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
    const latestLoan = loans[0];
    return this._resolveLoanAccountRelations(latestLoan);
  }

  async listPayments(filters: HistoryFilters): Promise<any[]> {
    const allPayments = jsonDb.findMany('paymentTransaction', { 
      userId: filters.userId, 
      paymentType: filters.paymentType ?? PaymentType.EMI 
    });

    const statusIn = filters.status 
      ? [filters.status] 
      : [PaymentStatus.SUCCESS, PaymentStatus.FAILED, PaymentStatus.PENDING, PaymentStatus.REFUNDED];

    let filtered = allPayments.filter((p: any) => statusIn.includes(p.paymentStatus));

    if (filters.dateFrom) {
      filtered = filtered.filter((p: any) => new Date(p.createdAt) >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      filtered = filtered.filter((p: any) => new Date(p.createdAt) <= filters.dateTo!);
    }

    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      const emiNumber = Number(q.replace(/^#/, ''));
      
      // Need to resolve schedules for all payments to check emiNumber
      filtered = filtered.filter((p: any) => {
        let match = false;
        if (p.razorpayPaymentId?.toLowerCase().includes(q)) match = true;
        if (p.razorpayOrderId?.toLowerCase().includes(q)) match = true;
        if (p.id.toLowerCase().includes(q)) match = true;
        
        if (!match && Number.isFinite(emiNumber)) {
          const schedule = jsonDb.findOne('emi_schedules', { id: p.emiScheduleId });
          if (schedule && schedule.emiNumber === emiNumber) match = true;
        }
        return match;
      });
    }

    filtered.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Resolve relations
    return filtered.map((p: any) => {
      const schedule = jsonDb.findOne('emi_schedules', { id: p.emiScheduleId });
      let resolvedSchedule = null;
      if (schedule) {
        const loanAccount = jsonDb.findOne('loanAccount', { id: schedule.loanAccountId });
        let resolvedLoanAccount = null;
        if (loanAccount) {
          const application = jsonDb.findOne('emi_applications', { id: loanAccount.applicationId });
          resolvedLoanAccount = { ...loanAccount, application };
        }
        resolvedSchedule = { ...schedule, loanAccount: resolvedLoanAccount };
      }
      return {
        ...p,
        emiSchedule: resolvedSchedule
      };
    });
  }

  findPaymentByIdForUser(paymentId: string, userId: string) {
    const payment = jsonDb.findOne('paymentTransaction', { id: paymentId, userId });
    if (!payment) return null;

    const schedule = jsonDb.findOne('emi_schedules', { id: payment.emiScheduleId });
    let resolvedSchedule = null;
    if (schedule) {
      const loanAccount = jsonDb.findOne('loanAccount', { id: schedule.loanAccountId });
      let resolvedLoanAccount = null;
      if (loanAccount) {
        const application = jsonDb.findOne('emi_applications', { id: loanAccount.applicationId });
        const schedules = jsonDb.findMany('emi_schedules', { loanAccountId: loanAccount.id })
          .sort((a: any, b: any) => a.emiNumber - b.emiNumber);
        resolvedLoanAccount = { ...loanAccount, application, schedule: schedules };
      }
      resolvedSchedule = { ...schedule, loanAccount: resolvedLoanAccount };
    }

    return {
      ...payment,
      emiSchedule: resolvedSchedule
    };
  }
}

export const emiHistoryRepository = new EmiHistoryRepository();
export { PaymentStatus, PaymentType, EmiPaymentStatus, LoanStatus };
