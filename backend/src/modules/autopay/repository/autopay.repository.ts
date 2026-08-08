import {
  AutopayMandateStatus,
  AutopayPaymentMethod,
  LoanStatus,
} from '@prisma/client';
import { jsonDb } from '../../../config/json-db';

type AutopayMandate = Record<string, any>;
type LoanAccount = Record<string, any>;

export type MandateWithLoan = AutopayMandate & {
  loanAccount: LoanAccount & {
    application?: { applicationNumber: string; productName: string | null } | null;
  };
};

export class AutopayRepository {
  private _resolveLoanAccountRelations(loanAccount: any) {
    if (!loanAccount) return null;
    const application = jsonDb.findOne('emi_applications', { id: loanAccount.applicationId });
    const schedule = jsonDb.findMany('emi_schedules', { loanAccountId: loanAccount.id })
      .sort((a: any, b: any) => a.emiNumber - b.emiNumber);
    return { ...loanAccount, application, schedule };
  }

  findActiveLoanForUser(userId: string) {
    const loans = jsonDb.findMany('loanAccount', { userId, loanStatus: LoanStatus.ACTIVE })
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return this._resolveLoanAccountRelations(loans[0]);
  }

  findLoanById(loanId: string) {
    const loan = jsonDb.findOne('loanAccount', { id: loanId });
    if (!loan) return null;
    const application = jsonDb.findOne('emi_applications', { id: loan.applicationId });
    const schedule = jsonDb.findMany('emi_schedules', { loanAccountId: loan.id })
      .sort((a: any, b: any) => a.emiNumber - b.emiNumber);
    const autopayMandates = jsonDb.findMany('autopayMandate', { loanAccountId: loan.id })
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return {
      ...loan,
      application,
      schedule,
      autopayMandates
    };
  }

  /** Find the open mandate for a loan by its provider mandate id (Razorpay subscription id). */
  findByMandateId(mandateId: string) {
    const mandate = jsonDb.findOne('autopayMandate', { mandateId });
    if (!mandate) return null;
    const loanAccount = jsonDb.findOne('loanAccount', { id: mandate.loanAccountId });
    return {
      ...mandate,
      loanAccount: loanAccount ? { ...loanAccount } : null,
    };
  }

  /** Find a payment transaction by the gateway payment id (dedup for webhook retries). */
  findTransactionByPaymentId(razorpayPaymentId: string) {
    return jsonDb.findOne('paymentTransaction', { razorpayPaymentId });
  }

  /** Record a Razorpay auto-collected EMI charge as a payment transaction. */
  createAutoCollectTransaction(input: {
    applicationId: string;
    userId: string;
    emiScheduleId: string;
    razorpayPaymentId: string;
    amount: number;
  }) {
    return jsonDb.insert('paymentTransaction', {
      applicationId: input.applicationId,
      userId: input.userId,
      emiScheduleId: input.emiScheduleId,
      razorpayOrderId: `autopay_${input.razorpayPaymentId}`,
      razorpayPaymentId: input.razorpayPaymentId,
      amount: input.amount,
      currency: 'INR',
      paymentStatus: 'PENDING',
      paymentType: 'EMI',
      source: 'AUTOPAY',
    });
  }

  findCurrentMandate(loanAccountId: string) {
    const mandates = jsonDb.findMany('autopayMandate', { loanAccountId })
      .filter((m: any) => [AutopayMandateStatus.PENDING, AutopayMandateStatus.ACTIVE, AutopayMandateStatus.PAUSED].includes(m.status))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const mandate = mandates[0];
    if (!mandate) return null;
    
    const loanAccount = jsonDb.findOne('loanAccount', { id: mandate.loanAccountId });
    let resolvedLoanAccount = null;
    if (loanAccount) {
      const application = jsonDb.findOne('emi_applications', { id: loanAccount.applicationId });
      resolvedLoanAccount = { ...loanAccount, application };
    }
    
    return {
      ...mandate,
      loanAccount: resolvedLoanAccount
    };
  }

  findActiveOrPendingForLoan(loanAccountId: string) {
    const mandates = jsonDb.findMany('autopayMandate', { loanAccountId })
      .filter((m: any) => [AutopayMandateStatus.PENDING, AutopayMandateStatus.ACTIVE].includes(m.status))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return mandates[0] || null;
  }

  listHistoryForUser(userId: string) {
    const mandates = jsonDb.findMany('autopayMandate', { userId })
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return mandates.map((m: any) => {
      const loanAccount = jsonDb.findOne('loanAccount', { id: m.loanAccountId });
      let resolvedLoanAccount = null;
      if (loanAccount) {
        const application = jsonDb.findOne('emi_applications', { id: loanAccount.applicationId });
        resolvedLoanAccount = { ...loanAccount, application };
      }
      return { ...m, loanAccount: resolvedLoanAccount };
    });
  }

  listForAdmin(status?: AutopayMandateStatus) {
    const filter = status ? { status } : {};
    const mandates = jsonDb.findMany('autopayMandate', filter)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
    return mandates.map((m: any) => {
      const loanAccount = jsonDb.findOne('loanAccount', { id: m.loanAccountId });
      let resolvedLoanAccount = null;
      if (loanAccount) {
        const application = jsonDb.findOne('emi_applications', { id: loanAccount.applicationId });
        resolvedLoanAccount = { ...loanAccount, application };
      }
      
      const user = jsonDb.findOne('users', { id: m.userId });
      
      return {
        ...m,
        loanAccount: resolvedLoanAccount,
        user: user ? { id: user.id, fullName: user.fullName, mobile: user.phone || user.mobile, email: user.email } : null
      };
    });
  }

  createMandate(data: {
    userId: string;
    loanAccountId: string;
    provider: AutopayMandate['provider'];
    mandateId: string;
    mandateReference: string;
    paymentMethod: AutopayPaymentMethod;
    bankName?: string | null;
    upiId?: string | null;
    maximumDebitAmount: number;
    frequency: string;
    nextDebitDate?: Date | null;
    status: AutopayMandateStatus;
    providerPayload?: object;
  }) {
    const mandate = jsonDb.insert('autopayMandate', {
      userId: data.userId,
      loanAccountId: data.loanAccountId,
      provider: data.provider,
      mandateId: data.mandateId,
      mandateReference: data.mandateReference,
      paymentMethod: data.paymentMethod,
      bankName: data.bankName ?? null,
      upiId: data.upiId ?? null,
      maximumDebitAmount: data.maximumDebitAmount,
      frequency: data.frequency,
      nextDebitDate: data.nextDebitDate ?? null,
      status: data.status,
      providerPayload: data.providerPayload ?? undefined,
    });

    const loanAccount = jsonDb.findOne('loanAccount', { id: mandate.loanAccountId });
    let resolvedLoanAccount = null;
    if (loanAccount) {
      const application = jsonDb.findOne('emi_applications', { id: loanAccount.applicationId });
      resolvedLoanAccount = { ...loanAccount, application };
    }
    
    return {
      ...mandate,
      loanAccount: resolvedLoanAccount
    };
  }

  updateMandateStatus(
    id: string,
    data: {
      status: AutopayMandateStatus;
      failureReason?: string | null;
      providerPayload?: object;
      nextDebitDate?: Date | null;
    },
  ) {
    jsonDb.update('autopayMandate', { id }, {
      status: data.status,
      failureReason: data.failureReason ?? undefined,
      providerPayload: data.providerPayload ?? undefined,
      nextDebitDate: data.nextDebitDate === undefined ? undefined : data.nextDebitDate,
    });
    const mandate = jsonDb.findOne('autopayMandate', { id });
    if (!mandate) return null;
    
    const loanAccount = jsonDb.findOne('loanAccount', { id: mandate.loanAccountId });
    let resolvedLoanAccount = null;
    if (loanAccount) {
      const application = jsonDb.findOne('emi_applications', { id: loanAccount.applicationId });
      resolvedLoanAccount = { ...loanAccount, application };
    }
    
    return {
      ...mandate,
      loanAccount: resolvedLoanAccount
    };
  }

  setLoanAutopayEnabled(loanAccountId: string, enabled: boolean) {
    jsonDb.update('loanAccount', { id: loanAccountId }, { autopayEnabled: enabled });
    return jsonDb.findOne('loanAccount', { id: loanAccountId });
  }

  async cancelOpenMandatesForLoan(loanAccountId: string) {
    const mandates = jsonDb.findMany('autopayMandate', { loanAccountId })
      .filter((m: any) => [
        AutopayMandateStatus.PENDING,
        AutopayMandateStatus.ACTIVE,
        AutopayMandateStatus.PAUSED,
      ].includes(m.status));
      
    mandates.forEach((m: any) => {
      jsonDb.update('autopayMandate', { id: m.id }, { status: AutopayMandateStatus.CANCELLED });
    });
    
    return { count: mandates.length };
  }
}

export const autopayRepository = new AutopayRepository();
export { AutopayMandateStatus, AutopayPaymentMethod, LoanStatus };
