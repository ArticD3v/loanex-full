import { EmiApplicationStatus, PaymentStatus } from '@prisma/client';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../../common/errors/app-error';
import { env } from '../../../config/env';
import { auditLogService } from '../../verification/service/audit-log.service';
import { loanService } from '../../loan/service/loan.service';
import { paymentRepository } from '../repository/payment.repository';
import {
  createRazorpayOrder,
  createRazorpayRefund,
  fetchRazorpayPayment,
  getRazorpayKeyId,
  isPaymentDevBypass,
  signDevPayment,
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from './razorpay.service';

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function productImagePath(productId: string): string {
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

function buildSummary(app: any) {
  const productPrice = toNumber(app.sellingPrice || app.productPrice || app.price || 0);
  const loanAmount = toNumber(
    app.approvedAmount || app.loanAmount || app.requestedAmount || productPrice,
  );
  const downPayment = toNumber(
    app.approvedDownPayment || app.downPayment || app.requestedDownPayment || 0,
  );
  const processingFee = toNumber(app.processingFee || app.service_charge || 0);
  const gst =
    processingFee > 0 ? roundMoney((processingFee * env.GST_PERCENT) / 100) : 0;
  const totalPayableToday = roundMoney(downPayment + processingFee + gst);
  const remainingFinancedAmount = roundMoney(Math.max(0, productPrice - downPayment));

  return {
    productPrice,
    loanAmount,
    downPayment,
    processingFee,
    gst,
    gstPercent: env.GST_PERCENT,
    totalPayableToday,
    remainingFinancedAmount,
  };
}

const COMPLETED_DOWN_PAYMENT_STATUSES: EmiApplicationStatus[] = [
  EmiApplicationStatus.DOWN_PAYMENT_COMPLETED,
  EmiApplicationStatus.ORDER_CONFIRMED,
  EmiApplicationStatus.ACTIVE_EMI,
];

function isDownPaymentCompleted(
  app: { status: EmiApplicationStatus; order?: { paymentTransactionId: string | null } | null },
  successPayment: boolean,
): boolean {
  return (
    successPayment ||
    COMPLETED_DOWN_PAYMENT_STATUSES.includes(app.status) ||
    Boolean(app.order?.paymentTransactionId)
  );
}

export class PaymentService {
  async getDownPaymentContext(userId: string) {
    const app = await paymentRepository.findLatestApplicationForUser(userId);
    if (!app) {
      throw new NotFoundError('No EMI application found for this account.');
    }

    this.assertAccessRedirect(app.status);

    const success = await paymentRepository.findSuccessDownPayment(app.id);
    if (isDownPaymentCompleted(app, Boolean(success))) {
      throw new ConflictError('Down payment already completed for this application.', {
        code: 'PAYMENT_ALREADY_COMPLETED',
        status: app.status,
        orderNumber: app.order?.orderNumber ?? null,
        nextStep: 'ORDER_CONFIRMATION',
      });
    }

    const summary = buildSummary(app);

    return {
      applicationId: app.id,
      applicationNumber: app.applicationNumber ?? app.id,
      orderNumber: app.order?.orderNumber ?? null,
      orderId: app.order?.id ?? null,
      status: app.status,
      productId: app.productId,
      productName: app.productName,
      productImage: productImagePath(app.productId),
      productPrice: summary.productPrice,
      approvedLoanAmount: summary.loanAmount,
      approvedDownPayment: summary.downPayment,
      remainingFinancedAmount: summary.remainingFinancedAmount,
      paymentSummary: summary,
      razorpayKeyId: getRazorpayKeyId(),
      paymentDevBypass: isPaymentDevBypass(),
      currency: env.RAZORPAY_CURRENCY,
    };
  }

  async createOrder(
    userId: string,
    meta?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const app = await paymentRepository.findLatestApplicationForUser(userId);
    if (!app) {
      throw new NotFoundError('No EMI application found for this account.');
    }

    this.assertCanPay(app.status);

    const existingSuccess = await paymentRepository.findSuccessDownPayment(app.id);
    if (isDownPaymentCompleted(app, Boolean(existingSuccess))) {
      throw new ConflictError('Down payment already completed.', {
        code: 'PAYMENT_ALREADY_COMPLETED',
        nextStep: 'ORDER_CONFIRMATION',
      });
    }

    const user = await paymentRepository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const summary = buildSummary(app);
    if (summary.totalPayableToday <= 0) {
      throw new BadRequestError('Invalid down payment amount.');
    }

    const razorpayOrder = await createRazorpayOrder({
      amountInr: summary.totalPayableToday,
      receipt: app.id,
      notes: {
        applicationId: app.id,
        userId,
        paymentType: 'DOWN_PAYMENT',
      },
    });

    const transaction = await paymentRepository.createTransaction({
      applicationId: app.id,
      userId,
      razorpayOrderId: razorpayOrder.id,
      amount: summary.totalPayableToday,
      currency: razorpayOrder.currency,
    });

    if (
      app.status === EmiApplicationStatus.OFFER_ACCEPTED ||
      app.status === EmiApplicationStatus.APPROVED
    ) {
      await paymentRepository.setApplicationDownPaymentPending(app.id);
    }

    await auditLogService.log({
      userId,
      action: 'PAYMENT_ORDER_CREATED',
      entity: 'payment_transactions',
      metadata: {
        applicationNumber: app.applicationNumber ?? app.id,
        razorpayOrderId: razorpayOrder.id,
        amount: summary.totalPayableToday,
        timestamp: new Date().toISOString(),
        ipAddress: meta?.ipAddress ?? null,
        device: meta?.userAgent ?? null,
      },
    });

    return {
      applicationId: app.id,
      applicationNumber: app.applicationNumber ?? app.id,
      transactionId: transaction.id,
      razorpayOrderId: razorpayOrder.id,
      amount: summary.totalPayableToday,
      amountPaise: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: getRazorpayKeyId(),
      paymentDevBypass: isPaymentDevBypass(),
      customer: {
        name: user.fullName,
        email: user.email,
        contact: user.mobile,
      },
      prefill: {
        name: user.fullName,
        email: user.email,
        contact: user.mobile,
      },
      notes: {
        applicationNumber: app.applicationNumber ?? app.id,
        productName: app.productName ?? app.productId,
      },
    };
  }

  async verifyPayment(
    userId: string,
    input: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
    meta?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const transaction = await paymentRepository.findByRazorpayOrderId(
      input.razorpayOrderId,
    );
    if (!transaction || transaction.userId !== userId) {
      throw new NotFoundError('Payment order not found for this account.');
    }

    if (transaction.paymentStatus === PaymentStatus.SUCCESS) {
      const order = await paymentRepository.findOrderByApplication(
        transaction.applicationId,
        userId,
      );
      return {
        paymentStatus: 'SUCCESS' as const,
        alreadyProcessed: true,
        orderNumber: order?.orderNumber ?? null,
        nextStep: 'ORDER_CONFIRMATION' as const,
      };
    }

    const valid = verifyRazorpaySignature({
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
    });

    if (!valid) {
      await paymentRepository.markFailed(transaction.id);
      await auditLogService.log({
        userId,
        action: 'PAYMENT_SIGNATURE_FAILED',
        entity: 'payment_transactions',
        metadata: {
          razorpayOrderId: input.razorpayOrderId,
          razorpayPaymentId: input.razorpayPaymentId,
          timestamp: new Date().toISOString(),
          ipAddress: meta?.ipAddress ?? null,
        },
      });
      throw new BadRequestError('Payment signature verification failed.', {
        code: 'SIGNATURE_FAILED',
      });
    }

    // Server-side confirmation — never trust frontend callback alone.
    if (!isPaymentDevBypass()) {
      const remote = await fetchRazorpayPayment(input.razorpayPaymentId);
      const okStatus = ['captured', 'authorized'].includes(String(remote.status).toLowerCase());
      if (!okStatus) {
        await paymentRepository.markFailed(transaction.id);
        throw new BadRequestError('Payment not captured at Razorpay.', {
          code: 'PAYMENT_NOT_CAPTURED',
          status: remote.status,
        });
      }
      if (remote.orderId && remote.orderId !== input.razorpayOrderId) {
        await paymentRepository.markFailed(transaction.id);
        throw new BadRequestError('Payment order mismatch.', {
          code: 'ORDER_MISMATCH',
        });
      }
    }

    const app = await paymentRepository.findApplicationForUser(
      transaction.applicationId,
      userId,
    );
    if (!app) {
      throw new NotFoundError('EMI application not found.');
    }

    const orderNumber =
      app.order?.orderNumber ?? (await this.generateOrderNumber());
    const result = await paymentRepository.completePaymentAndCreateOrder({
      transactionId: transaction.id,
      applicationId: app.id,
      userId,
      productId: app.productId,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
      orderNumber,
    });

    const loan = await loanService.ensureLoanAfterDownPayment(app.id);

    await auditLogService.log({
      userId,
      action: 'PAYMENT_SUCCESS',
      entity: 'payment_transactions',
      metadata: {
        applicationNumber: app.applicationNumber ?? app.id,
        orderNumber: result.order.orderNumber,
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        amount: toNumber(transaction.amount),
        timestamp: new Date().toISOString(),
        ipAddress: meta?.ipAddress ?? null,
        device: meta?.userAgent ?? null,
      },
    });

    await auditLogService.log({
      userId,
      action: 'ORDER_CREATED',
      entity: 'orders',
      metadata: {
        orderNumber: result.order.orderNumber,
        applicationNumber: app.applicationNumber ?? app.id,
        paymentTransactionId: result.payment.id,
        productId: app.productId,
        timestamp: new Date().toISOString(),
      },
    });

    await auditLogService.log({
      userId,
      action: 'ORDER_CONFIRMED',
      entity: 'orders',
      metadata: {
        orderNumber: result.order.orderNumber,
        orderStatus: result.order.orderStatus,
        estimatedDeliveryDate: result.order.estimatedDeliveryDate instanceof Date
          ? result.order.estimatedDeliveryDate.toISOString()
          : String(result.order.estimatedDeliveryDate ?? ''),
        timestamp: new Date().toISOString(),
      },
    });

    return {
      paymentStatus: 'SUCCESS' as const,
      alreadyProcessed: false,
      transactionId: result.payment.id,
      applicationId: app.id,
      applicationNumber: app.applicationNumber ?? app.id,
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      orderStatus: result.order.orderStatus,
      loanAccountNumber: loan.loanAccountNumber,
      amount: toNumber(result.payment.amount),
      currency: result.payment.currency,
      nextStep: 'ORDER_CONFIRMATION' as const,
    };
  }

  /** Dev-only helper to complete checkout without Razorpay UI. */
  async createDevBypassSignature(userId: string, razorpayOrderId: string) {
    if (!isPaymentDevBypass()) {
      throw new ForbiddenError('Dev payment bypass is disabled.');
    }

    const transaction = await paymentRepository.findByRazorpayOrderId(razorpayOrderId);
    if (!transaction || transaction.userId !== userId) {
      throw new NotFoundError('Payment order not found for this account.');
    }

    const paymentId = `pay_dev_${Date.now()}`;
    return {
      razorpayOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signDevPayment(razorpayOrderId, paymentId),
    };
  }

  async getByApplicationId(applicationId: string, userId: string) {
    const app = await paymentRepository.findApplicationForUser(applicationId, userId);
    if (!app) {
      throw new NotFoundError('EMI application not found for this account.');
    }

    const payments = await paymentRepository.listByApplicationId(applicationId, userId);
    const order = app.order;

    return {
      applicationId: app.id,
      applicationNumber: app.applicationNumber ?? app.id,
      status: app.status,
      order: order
        ? {
            id: order.id,
            orderNumber: order.orderNumber,
            orderStatus: order.orderStatus,
            productId: order.productId,
            createdAt: order.createdAt,
          }
        : null,
      payments: payments.map((p) => ({
        id: p.id,
        razorpayOrderId: p.razorpayOrderId,
        razorpayPaymentId: p.razorpayPaymentId,
        amount: toNumber(p.amount),
        currency: p.currency,
        paymentStatus: p.paymentStatus,
        paymentType: p.paymentType,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    };
  }

  async getOrderConfirmation(userId: string, orderNumber?: string) {
    const order = orderNumber
      ? await paymentRepository.findOrderByNumber(orderNumber, userId)
      : await (async () => {
          const app = paymentRepository.findLatestApplicationForUser(userId);
          if (!app?.order) return null;
          return paymentRepository.findOrderByApplication(app.id, userId);
        })();

    const latestOrder = order ?? (await paymentRepository.findLatestOrderForUser(userId));

    if (!latestOrder) {
      throw new NotFoundError('Order not found for this account.');
    }

    const summary = buildSummary(latestOrder.application);

    return {
      orderNumber: latestOrder.orderNumber,
      orderStatus: latestOrder.orderStatus,
      applicationNumber:
        latestOrder.application.applicationNumber ?? latestOrder.application.id,
      productId: latestOrder.productId,
      productName: latestOrder.application.productName,
      productImage: productImagePath(latestOrder.productId),
      productPrice: summary.productPrice,
      approvedLoanAmount: summary.loanAmount,
      approvedDownPayment: summary.downPayment,
      amountPaidToday: summary.totalPayableToday,
      createdAt: latestOrder.createdAt,
    };
  }

  private assertCanPay(status: EmiApplicationStatus) {
    if (!paymentRepository.isPayableStatus(status)) {
      throw new BadRequestError('Down payment is not available for this application.', {
        code: 'PAYMENT_NOT_AVAILABLE',
        status,
      });
    }
  }

  private assertAccessRedirect(status: EmiApplicationStatus) {
    if (
      status === EmiApplicationStatus.DOWN_PAYMENT_COMPLETED ||
      status === EmiApplicationStatus.ORDER_CONFIRMED ||
      status === EmiApplicationStatus.ACTIVE_EMI
    ) {
      throw new ConflictError('Down payment already completed.', {
        code: 'PAYMENT_ALREADY_COMPLETED',
        status,
        nextStep: 'ORDER_CONFIRMATION',
      });
    }

    if (!paymentRepository.isPayableStatus(status)) {
      throw new BadRequestError('Down payment is not available for this application.', {
        code: 'PAYMENT_NOT_AVAILABLE',
        status,
      });
    }
  }

  async fetchPayment(userId: string, paymentId: string) {
    const remote = await fetchRazorpayPayment(paymentId);
    const transaction = remote.orderId
      ? await paymentRepository.findByRazorpayOrderId(remote.orderId)
      : null;

    if (transaction && transaction.userId !== userId) {
      throw new ForbiddenError('Payment does not belong to this account.');
    }

    return {
      paymentId: remote.id,
      status: remote.status,
      orderId: remote.orderId,
      amountPaise: remote.amount,
      currency: remote.currency,
      method: remote.method,
      localStatus: transaction?.paymentStatus ?? null,
      transactionId: transaction?.id ?? null,
    };
  }

  async refundPayment(
    userId: string,
    input: { razorpayPaymentId: string; amountInr?: number; reason?: string },
  ) {
    const remote = await fetchRazorpayPayment(input.razorpayPaymentId);
    const transaction = remote.orderId
      ? await paymentRepository.findByRazorpayOrderId(remote.orderId)
      : null;

    if (!transaction || transaction.userId !== userId) {
      throw new NotFoundError('Payment not found for this account.');
    }

    if (transaction.paymentStatus !== PaymentStatus.SUCCESS) {
      throw new BadRequestError('Only successful payments can be refunded.');
    }

    const amountPaise =
      input.amountInr != null
        ? Math.round(input.amountInr * 100)
        : undefined;

    const refund = await createRazorpayRefund({
      paymentId: input.razorpayPaymentId,
      amountPaise,
      notes: {
        userId,
        reason: input.reason ?? 'customer_refund',
        transactionId: transaction.id,
      },
    });

    await paymentRepository.markRefunded(transaction.id, {
      refundId: refund.id,
      refundStatus: refund.status,
      refundAmount: refund.amount,
    });

    await auditLogService.log({
      userId,
      action: 'PAYMENT_REFUND_CREATED',
      entity: 'payment_transactions',
      metadata: {
        transactionId: transaction.id,
        razorpayPaymentId: input.razorpayPaymentId,
        refundId: refund.id,
        amount: refund.amount,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      refundId: refund.id,
      status: refund.status,
      amountPaise: refund.amount,
      transactionId: transaction.id,
    };
  }

  /**
   * Razorpay webhook — success (payment.captured) and failure (payment.failed).
   * Signature validated before any state change.
   */
  async handleWebhook(
    rawBody: string | Buffer,
    signature: string | undefined,
    parsed?: any,
  ) {
    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      throw new BadRequestError('Invalid webhook signature.', {
        code: 'WEBHOOK_SIGNATURE_FAILED',
      });
    }

    const event = parsed ?? JSON.parse(
      typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'),
    );
    const eventName = String(event?.event ?? '');
    const paymentEntity =
      event?.payload?.payment?.entity ?? event?.payload?.payment ?? null;
    const orderEntity = event?.payload?.order?.entity ?? null;

    const paymentId = paymentEntity?.id ? String(paymentEntity.id) : null;
    const orderId =
      (paymentEntity?.order_id ? String(paymentEntity.order_id) : null) ??
      (orderEntity?.id ? String(orderEntity.id) : null);

    if (!orderId) {
      return { handled: false, reason: 'NO_ORDER_ID', event: eventName };
    }

    const transaction = await paymentRepository.findByRazorpayOrderId(orderId);
    if (!transaction) {
      return { handled: false, reason: 'UNKNOWN_ORDER', event: eventName, orderId };
    }

    if (
      eventName === 'payment.captured' ||
      eventName === 'order.paid' ||
      String(paymentEntity?.status).toLowerCase() === 'captured'
    ) {
      if (transaction.paymentStatus === PaymentStatus.SUCCESS) {
        return { handled: true, alreadyProcessed: true, event: eventName };
      }

      const app = paymentRepository.findLatestApplicationForUser(transaction.userId);
      const application =
        (await paymentRepository.findApplicationForUser(
          transaction.applicationId,
          transaction.userId,
        )) ?? app;

      if (!application) {
        return { handled: false, reason: 'APPLICATION_MISSING', event: eventName };
      }

      const orderNumber =
        application.order?.orderNumber ?? (await this.generateOrderNumber());

      await paymentRepository.completePaymentAndCreateOrder({
        transactionId: transaction.id,
        applicationId: application.id,
        userId: transaction.userId,
        productId: application.productId,
        razorpayPaymentId: paymentId ?? `wh_${Date.now()}`,
        razorpaySignature: signature,
        orderNumber,
      });

      await loanService.ensureLoanAfterDownPayment(application.id);

      await auditLogService.log({
        userId: transaction.userId,
        action: 'PAYMENT_WEBHOOK_SUCCESS',
        entity: 'payment_transactions',
        metadata: {
          event: eventName,
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          timestamp: new Date().toISOString(),
        },
      });

      return { handled: true, paymentStatus: 'SUCCESS', event: eventName };
    }

    if (
      eventName === 'payment.failed' ||
      String(paymentEntity?.status).toLowerCase() === 'failed'
    ) {
      if (transaction.paymentStatus !== PaymentStatus.SUCCESS) {
        await paymentRepository.markFailed(transaction.id);
      }

      await auditLogService.log({
        userId: transaction.userId,
        action: 'PAYMENT_WEBHOOK_FAILED',
        entity: 'payment_transactions',
        metadata: {
          event: eventName,
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          timestamp: new Date().toISOString(),
        },
      });

      return { handled: true, paymentStatus: 'FAILED', event: eventName };
    }

    return { handled: false, reason: 'UNHANDLED_EVENT', event: eventName };
  }

  private async generateOrderNumber(): Promise<string> {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const prefix = `LX-ORD-${yyyy}${mm}${dd}-`;
    const count = await paymentRepository.countOrdersToday(prefix);
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }
}

export const paymentService = new PaymentService();
