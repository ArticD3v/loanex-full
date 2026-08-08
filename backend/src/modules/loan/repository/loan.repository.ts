import { EmiPaymentStatus, LoanStatus } from '@prisma/client';
import { jsonDb } from '../../../config/json-db';
import { addMonths, buildEmiSchedule, istMidnight } from '../service/emi-calculator.service';

type EmiApplication = Record<string, any>;
type EmiSchedule = Record<string, any>;
type LoanAccount = Record<string, any>;
type Order = Record<string, any>;
type User = Record<string, any>;

export type LoanWithRelations = LoanAccount & {
  application: EmiApplication & { order?: Order | null };
  user?: Pick<User, 'id' | 'fullName' | 'mobile' | 'email'> | null;
  schedule: EmiSchedule[];
};

export class LoanRepository {
  findById(loanId: string) {
    return jsonDb.findOne('loanAccount', { id: loanId });
  }

  findByIdForUser(loanId: string, userId: string) {
    const loan = jsonDb.findOne('loanAccount', { id: loanId, userId });
    return this.enrich(loan);
  }

  findByUserId(userId: string) {
    const results = jsonDb.findMany('loanAccount', { userId });
    return results.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;
  }

  listUserLoans(userId: string) {
    const results = jsonDb.findMany('loanAccount', { userId });
    return results
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((loan) => this.enrich(loan))
      .filter(Boolean);
  }

  findActiveByUserId(userId: string) {
    const results = jsonDb.findMany('loanAccount', { userId, loanStatus: LoanStatus.ACTIVE });
    return results.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;
  }

  findByApplicationId(applicationId: string) {
    return jsonDb.findOne('loanAccount', { applicationId });
  }

  listForAdmin(status?: LoanStatus) {
    const results = status ? jsonDb.findMany('loanAccount', { loanStatus: status }) : jsonDb.findMany('loanAccount', {});
    return results
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((loan) => this.enrich(loan))
      .filter(Boolean);
  }

  getForAdmin(loanId: string) {
    return this.enrich(jsonDb.findOne('loanAccount', { id: loanId }));
  }

  countLoansToday(prefix: string) {
    const results = jsonDb.findMany('loanAccount', {});
    return results.filter((r: any) => r.loanAccountNumber?.startsWith(prefix)).length;
  }

  async update(loanId: string, data: {
    loanStatus?: LoanStatus;
    emiAmount?: number;
    interestRate?: number;
    processingFee?: number;
    outstandingAmount?: number;
  }) {
    jsonDb.update('loanAccount', { id: loanId }, data);
    return this.enrich(jsonDb.findOne('loanAccount', { id: loanId }));
  }

  /**
   * Legacy loans (created before the schedule feature, or with a dropped
   * emi_schedules table) have no instalment rows — nothing would ever show
   * them a schedule or allow EMI payment. Rebuild the schedule from the
   * loan's own terms so those loans become usable again.
   */
  private ensureSchedule(loan: any): void {
    const existing = jsonDb.findMany('emi_schedules', { loanAccountId: loan.id });
    if (existing.length > 0) return;

    const loanAmount = Number(loan.loanAmount ?? 0);
    const tenure = Number(loan.loanTenure ?? 6);
    if (loanAmount <= 0 || tenure <= 0) return;

    const startDate = loan.loanStartDate
      ? new Date(loan.loanStartDate)
      : istMidnight(new Date());

    const plan = buildEmiSchedule({
      principal: loanAmount,
      annualRatePercent: Number(loan.interestRate ?? 12.5),
      tenureMonths: tenure,
      startDate,
      emiAmount: Number(loan.emiAmount) || undefined,
    });

    for (const row of plan.rows) {
      jsonDb.insert('emi_schedules', {
        loanAccountId: loan.id,
        emiNumber: row.emiNumber,
        dueDate: row.dueDate,
        principalAmount: row.principalAmount,
        interestAmount: row.interestAmount,
        emiAmount: row.emiAmount,
        remainingBalance: row.remainingBalance,
        paymentStatus: EmiPaymentStatus.PENDING,
      });
    }

    if (!loan.loanStartDate) {
      jsonDb.update('loanAccount', { id: loan.id }, {
        loanStartDate: startDate,
        loanEndDate: addMonths(startDate, tenure),
        nextEmiDueDate: plan.rows[0]?.dueDate ?? null,
        outstandingAmount: Number(loan.outstandingAmount) || plan.totalPayable,
      });
    }
  }

  private enrich(loan: any): LoanWithRelations | null {
    if (!loan) return null;
    this.ensureSchedule(loan);
    const applicationRow =
      jsonDb.findOne('emi_applications', { id: loan.applicationId }) ??
      jsonDb.findOne('emiApplication', { id: loan.applicationId });
    const order = applicationRow
      ? jsonDb.findOne('orders', { applicationId: applicationRow.id })
      : null;
    const user = jsonDb.findOne('users', { id: loan.userId });
    const profile = jsonDb.findOne('profiles', { id: loan.userId });
    const schedule = jsonDb
      .findMany('emi_schedules', { loanAccountId: loan.id })
      .sort((a: any, b: any) => Number(a.emiNumber) - Number(b.emiNumber));
    return {
      ...loan,
      application: applicationRow ? { ...applicationRow, order } : null,
      user: user || profile
        ? {
            id: loan.userId,
            fullName: user?.fullName ?? profile?.fullName ?? 'Customer',
            mobile: user?.mobile ?? profile?.mobileNumber ?? profile?.mobile_number ?? '',
            email: user?.email ?? '',
          }
        : null,
      schedule: schedule ?? [],
    };
  }

  async createWithSchedule(input: {
    loanAccountNumber: string;
    applicationId: string;
    userId: string;
    productId: string;
    loanAmount: number;
    interestRate: number;
    processingFee: number;
    loanTenure: number;
    emiAmount: number;
    totalInterest: number;
    totalPayable: number;
    outstandingAmount: number;
    loanStartDate: Date;
    loanEndDate: Date;
    nextEmiDueDate?: Date | null;
    schedule: Array<{
      emiNumber: number;
      dueDate: Date;
      principalAmount: number;
      interestAmount: number;
      emiAmount: number;
      remainingBalance: number;
    }>;
  }) {
    const existing = jsonDb.findOne('loanAccount', { applicationId: input.applicationId });
    if (existing) return existing;

    const loan = jsonDb.insert('loanAccount', {
      loanAccountNumber: input.loanAccountNumber,
      applicationId: input.applicationId,
      userId: input.userId,
      productId: input.productId,
      loanAmount: input.loanAmount,
      interestRate: input.interestRate,
      processingFee: input.processingFee,
      loanTenure: input.loanTenure,
      emiAmount: input.emiAmount,
      totalInterest: input.totalInterest,
      totalPayable: input.totalPayable,
      outstandingAmount: input.outstandingAmount,
      paidAmount: 0,
      nextEmiDueDate: input.nextEmiDueDate ?? input.schedule[0]?.dueDate ?? null,
      loanStatus: LoanStatus.ACTIVE,
      loanStartDate: input.loanStartDate,
      loanEndDate: input.loanEndDate,
    });

    for (const row of input.schedule) {
      jsonDb.insert('emi_schedules', {
        loanAccountId: loan.id,
        emiNumber: row.emiNumber,
        dueDate: row.dueDate,
        principalAmount: row.principalAmount,
        interestAmount: row.interestAmount,
        emiAmount: row.emiAmount,
        remainingBalance: row.remainingBalance,
        paymentStatus: EmiPaymentStatus.PENDING,
      });
    }

    return this.enrich(loan);
  }

  async updateStatus(loanId: string, loanStatus: LoanStatus) {
    jsonDb.update('loanAccount', { id: loanId }, { loanStatus });
    return jsonDb.findOne('loanAccount', { id: loanId });
  }

  async markOverdue(loanAccountId: string, asOf: Date = new Date()) {
    const schedules = jsonDb.findMany('emi_schedules', { loanAccountId, paymentStatus: EmiPaymentStatus.PENDING });
    let count = 0;
    for (const sch of schedules) {
      if (new Date(sch.dueDate) < asOf) {
        jsonDb.update('emi_schedules', { id: sch.id }, { paymentStatus: EmiPaymentStatus.OVERDUE });
        count++;
      }
    }
    return { count };
  }
}

export const loanRepository = new LoanRepository();
export { LoanStatus, EmiPaymentStatus };
