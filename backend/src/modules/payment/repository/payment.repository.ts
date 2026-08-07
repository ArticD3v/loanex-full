import {
  EmiApplicationStatus,
  OrderStatus,
  PaymentStatus,
  PaymentType,
} from '@prisma/client';
import { jsonDb } from '../../../config/json-db';

const PAYABLE_STATUSES: EmiApplicationStatus[] = [
  EmiApplicationStatus.APPROVED,
  EmiApplicationStatus.OFFER_ACCEPTED,
  EmiApplicationStatus.DOWN_PAYMENT_PENDING,
];

export class PaymentRepository {
  findApplicationForUser(applicationId: string, userId: string) {
    const app = jsonDb.findOne('emi_applications', { id: applicationId, userId });
    if (!app) return null;
    const order = jsonDb.findOne('orders', { applicationId: app.id });
    return { ...app, order };
  }

  findLatestApplicationForUser(userId: string) {
    const apps = jsonDb.findMany('emi_applications', { userId })
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (!apps.length) return null;
    const app = apps[0];
    const order = jsonDb.findOne('orders', { applicationId: app.id });
    return { ...app, order };
  }

  findLatestOrderForUser(userId: string) {
    const orders = jsonDb.findMany('orders', { userId })
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (!orders.length) return null;
    const order = orders[0];
    const application = jsonDb.findOne('emi_applications', { id: order.applicationId });
    if (!application) return null;
    return { ...order, application };
  }

  findUserById(userId: string) {
    const user = jsonDb.findOne('users', { id: userId });
    if (!user) return null;
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
    };
  }

  findSuccessDownPayment(applicationId: string) {
    const payments = jsonDb.findMany('paymentTransaction', {
      applicationId,
      paymentType: PaymentType.DOWN_PAYMENT,
      paymentStatus: PaymentStatus.SUCCESS,
    }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return payments.length > 0 ? payments[0] : null;
  }

  findByRazorpayOrderId(razorpayOrderId: string) {
    return jsonDb.findOne('paymentTransaction', { razorpayOrderId });
  }

  listByApplicationId(applicationId: string, userId: string) {
    return jsonDb.findMany('paymentTransaction', { applicationId, userId })
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createTransaction(data: {
    applicationId: string;
    userId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
  }) {
    return jsonDb.insert('paymentTransaction', {
      applicationId: data.applicationId,
      userId: data.userId,
      razorpayOrderId: data.razorpayOrderId,
      amount: data.amount,
      currency: data.currency,
      paymentStatus: PaymentStatus.CREATED,
      paymentType: PaymentType.DOWN_PAYMENT,
    });
  }

  markPending(id: string) {
    jsonDb.update('paymentTransaction', { id }, { paymentStatus: PaymentStatus.PENDING });
    return jsonDb.findOne('paymentTransaction', { id });
  }

  markFailed(id: string) {
    jsonDb.update('paymentTransaction', { id }, { paymentStatus: PaymentStatus.FAILED });
    return jsonDb.findOne('paymentTransaction', { id });
  }

  markRefunded(
    id: string,
    data: { refundId: string; refundStatus: string; refundAmount: number },
  ) {
    jsonDb.update('paymentTransaction', { id }, {
      paymentStatus: PaymentStatus.REFUNDED,
      refundId: data.refundId,
      refundStatus: data.refundStatus,
      refundAmount: data.refundAmount,
      updatedAt: new Date().toISOString(),
    });
    return jsonDb.findOne('paymentTransaction', { id });
  }

  async completePaymentAndCreateOrder(input: {
    transactionId: string;
    applicationId: string;
    userId: string;
    productId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    orderNumber: string;
  }) {
    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 7);

    jsonDb.update('paymentTransaction', { id: input.transactionId }, {
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
      paymentStatus: PaymentStatus.SUCCESS,
    });
    const payment = jsonDb.findOne('paymentTransaction', { id: input.transactionId });

    jsonDb.update('emi_applications', { id: input.applicationId }, { status: EmiApplicationStatus.ACTIVE_EMI });
    const application = jsonDb.findOne('emi_applications', { id: input.applicationId });

    let existing = jsonDb.findOne('orders', { applicationId: input.applicationId });
    let order = existing;

    if (!existing) {
      order = await jsonDb.insertAwaited('orders', {
        orderNumber: input.orderNumber,
        applicationId: input.applicationId,
        userId: input.userId,
        profileId: input.userId,
        productId: input.productId,
        quantity: 1,
        paymentTransactionId: payment.id,
        orderStatus: OrderStatus.ORDER_CONFIRMED,
        status: OrderStatus.ORDER_CONFIRMED,
        paymentMethod: 'EMI',
        payment_status: 'SUCCESS',
        estimatedDeliveryDate,
        courierPartner: 'LoanEx Express',
        trackingNumber: `LXTRK${Date.now().toString().slice(-10)}`,
        warehouse: 'LoanEx Central Warehouse, Mumbai',
        deliveryAddress: 'Customer registered address',
        items: [{ productId: input.productId, quantity: 1 }],
        totalAmount: application?.sellingPrice ?? application?.approvedLoanAmount ?? 0,
        subtotal: application?.sellingPrice ?? application?.approvedLoanAmount ?? 0,
        total: application?.sellingPrice ?? application?.approvedLoanAmount ?? 0,
      });
    }

    if (existing && !existing.paymentTransactionId) {
      await jsonDb.updateAwaited('orders', { id: existing.id }, {
        paymentTransactionId: payment.id,
        orderStatus: OrderStatus.ORDER_CONFIRMED,
        status: OrderStatus.ORDER_CONFIRMED,
        payment_status: 'SUCCESS',
        estimatedDeliveryDate: existing.estimatedDeliveryDate ?? estimatedDeliveryDate,
      });
      order = jsonDb.findOne('orders', { id: existing.id });
    }

    const freshOrder = jsonDb.findOne('orders', { id: order.id });
    if (!freshOrder) throw new Error('Order not found');

    const hasTracking = jsonDb.findMany('orderTracking', { orderId: freshOrder.id }).length;
    if (hasTracking === 0) {
      jsonDb.insert('orderTracking', {
        orderId: freshOrder.id,
        status: 'ORDER_CONFIRMED',
        remarks: 'Order confirmed after successful down payment',
        updatedBy: 'system',
        location: freshOrder.warehouse ?? 'LoanEx Central Warehouse, Mumbai',
      });
    }

    return { payment, application, order: freshOrder };
  }

  setApplicationDownPaymentPending(applicationId: string) {
    jsonDb.update('emi_applications', { id: applicationId }, { status: EmiApplicationStatus.DOWN_PAYMENT_PENDING });
    return jsonDb.findOne('emi_applications', { id: applicationId });
  }

  countOrdersToday(prefix: string) {
    const orders = jsonDb.findMany('orders', {});
    return orders.filter((o: any) => o.orderNumber && o.orderNumber.startsWith(prefix)).length;
  }

  findOrderByApplication(applicationId: string, userId: string) {
    const order = jsonDb.findOne('orders', { applicationId, userId });
    if (!order) return null;
    const application = jsonDb.findOne('emi_applications', { id: order.applicationId });
    return { ...order, application };
  }

  findOrderByNumber(orderNumber: string, userId: string) {
    const order = jsonDb.findOne('orders', { orderNumber, userId });
    if (!order) return null;
    const application = jsonDb.findOne('emi_applications', { id: order.applicationId });
    return { ...order, application };
  }

  isPayableStatus(status: EmiApplicationStatus): boolean {
    return PAYABLE_STATUSES.includes(status);
  }
}

export const paymentRepository = new PaymentRepository();

export type DecimalLike = any | number | null | undefined;
