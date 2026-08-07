import {
  BadRequestError,
  NotFoundError,
} from '../../../common/errors/app-error';
import { OrderStatus } from '@prisma/client';
import { auditLogService } from '../../verification/service/audit-log.service';
import { loanService } from '../../loan/service/loan.service';
import { orderRepository, STATUS_FLOW } from '../repository/order.repository';
import {
  buildOrderPayload,
  buildTrackingPayload,
  generateOrderInvoicePdf,
  generateOrderReceiptPdf,
  productBrand,
  productImagePath,
} from './receipt.service';

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export class OrderService {
  async list(userId: string) {
    const orders = await orderRepository.listForUser(userId);
    const items = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      applicationId: order.applicationId ?? null,
      orderDate: order.createdAt,
      orderAmount: toNumber(order.application?.sellingPrice ?? order.totalAmount),
      paymentType: order.paymentMethod ?? 'FULL PAYMENT',
      orderStatus: order.orderStatus ?? 'CONFIRMED',
      product: {
        id: order.productId,
        name: order.application?.productName ?? 'Product',
        brand: productBrand(order.productId, order.productBrand),
        imageUrl: order.application?.productImage || productImagePath(order.productId),
      },
    }));

    return { items, totalItems: items.length };
  }

  async adminList() {
    const orders = await orderRepository.adminListAll();
    const items = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      orderAmount: toNumber(order.application?.sellingPrice || order.totalAmount),
      paymentType: order.paymentMethod || 'EMI',
      orderStatus: order.orderStatus || order.status,
      customerName: order.user?.fullName || 'Unknown',
      customerMobile: order.user?.mobile || 'Unknown',
      product: order.application ? {
        id: order.productId,
        name: order.application.productName ?? order.productId,
        brand: productBrand(order.productId, order.productBrand),
        imageUrl: order.application.productImage || productImagePath(order.productId),
      } : (order.items && order.items.length > 0 ? {
        id: order.items[0].productId,
        name: order.items[0].product?.name || order.items[0].productId,
        brand: productBrand(order.items[0].productId, order.items[0].product?.brand),
        imageUrl: order.items[0].product?.imageUrl || productImagePath(order.items[0].productId),
      } : null),
      items: order.items && order.items.length > 0 ? order.items.map((i: any) => ({
        product: {
          id: i.productId,
          name: i.product?.name || i.productId,
          brand: productBrand(i.productId, i.product?.brand),
          imageUrl: i.product?.imageUrl || productImagePath(i.productId),
        },
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })) : undefined,
    }));

    return { items, totalItems: items.length };
  }

  async adminGetById(orderId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      orderAmount: toNumber(order.application?.sellingPrice || order.totalAmount),
      paymentType: order.paymentMethod || 'EMI',
      orderStatus: order.orderStatus || order.status,
      customerName: order.user?.fullName || 'Unknown',
      customerMobile: order.user?.mobile || 'Unknown',
      customerId: order.user?.id || order.userId,
      productId: order.productId,
      productName: order.application?.productName ?? order.productId,
      sellingPrice: toNumber(order.application?.sellingPrice),
      totalAmount: toNumber(order.totalAmount),
      quantity: 1,
      productImageUrl: order.application?.productImage || productImagePath(order.productId),
      emiPlan: order.application?.productId,
      emiAmount: toNumber(order.application?.emiAmount),
      emiDuration: order.application?.tenure ? `${order.application.tenure} Months` : null,
    };
  }

  async getCurrent(userId: string) {
    const order = await orderRepository.findLatestForUser(userId);
    if (!order) {
      throw new NotFoundError('No order found for this account.');
    }

    await auditLogService.log({
      userId,
      action: 'ORDER_VIEWED',
      entity: 'orders',
      metadata: {
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        timestamp: new Date().toISOString(),
      },
    });

    return buildOrderPayload(order);
  }

  async getById(orderId: string, userId: string) {
    const order = await orderRepository.findByIdForUser(orderId, userId);
    if (!order) {
      throw new NotFoundError('Order not found for this account.');
    }

    await auditLogService.log({
      userId,
      action: 'ORDER_VIEWED',
      entity: 'orders',
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        timestamp: new Date().toISOString(),
      },
    });

    return buildOrderPayload(order);
  }

  async getTracking(orderId: string, userId: string) {
    const order = await orderRepository.findByIdForUser(orderId, userId);
    if (!order) {
      throw new NotFoundError('Order not found for this account.');
    }

    await auditLogService.log({
      userId,
      action: 'ORDER_VIEWED',
      entity: 'orders',
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        view: 'tracking',
        orderStatus: order.orderStatus,
        timestamp: new Date().toISOString(),
      },
    });

    return buildTrackingPayload(order);
  }

  async getReceipt(orderId: string, userId: string) {
    const order = await orderRepository.findByIdForUser(orderId, userId);
    if (!order) {
      throw new NotFoundError('Order not found for this account.');
    }

    const generated = await generateOrderReceiptPdf(order);
    await orderRepository.updateReceiptPath(order.id, generated.relativePath);

    await auditLogService.log({
      userId,
      action: 'RECEIPT_DOWNLOADED',
      entity: 'orders',
      metadata: {
        orderNumber: order.orderNumber,
        receiptPath: generated.relativePath,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      absolutePath: generated.absolutePath,
      fileName: `${order.orderNumber}-receipt.pdf`,
      orderNumber: order.orderNumber,
    };
  }

  async getInvoice(orderId: string, userId: string) {
    const order = await orderRepository.findByIdForUser(orderId, userId);
    if (!order) {
      throw new NotFoundError('Order not found for this account.');
    }

    const generated = await generateOrderInvoicePdf(order);
    await orderRepository.updateInvoicePath(order.id, generated.relativePath);

    await auditLogService.log({
      userId,
      action: 'INVOICE_DOWNLOADED',
      entity: 'orders',
      metadata: {
        orderNumber: order.orderNumber,
        invoicePath: generated.relativePath,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      absolutePath: generated.absolutePath,
      fileName: `${order.orderNumber}-invoice.pdf`,
      orderNumber: order.orderNumber,
    };
  }

  async adminUpdateStatus(
    orderId: string,
    input: {
      status: string;
      remarks?: string;
      location?: string;
      courierPartner?: string;
      trackingNumber?: string;
      warehouse?: string;
      deliveryAddress?: string;
      updatedBy?: string;
    },
  ) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found.');
    }

    const normalized =
      input.status.toUpperCase() === 'CONFIRMED'
        ? OrderStatus.ORDER_CONFIRMED
        : (input.status.toUpperCase() as OrderStatus);
    const nextStatus = normalized;
    if (!STATUS_FLOW.includes(nextStatus) && nextStatus !== OrderStatus.CANCELLED) {
      throw new BadRequestError('Invalid order status.', { status: input.status });
    }

    if (order.orderStatus === OrderStatus.CANCELLED) {
      throw new BadRequestError('Cancelled orders cannot be updated.');
    }

    if (order.orderStatus === OrderStatus.DELIVERED) {
      throw new BadRequestError('Delivered orders cannot be updated further.');
    }

    if (!orderRepository.isValidTransition(order.orderStatus, nextStatus)) {
      throw new BadRequestError('Invalid status transition.', {
        from: order.orderStatus,
        to: nextStatus,
        allowedNext: orderRepository.nextAllowedStatus(order.orderStatus),
      });
    }

    const updated = await orderRepository.updateStatus({
      orderId,
      status: nextStatus,
      remarks: input.remarks ?? null,
      updatedBy: input.updatedBy ?? 'admin',
      location: input.location ?? null,
      courierPartner: input.courierPartner ?? null,
      trackingNumber: input.trackingNumber ?? null,
      warehouse: input.warehouse ?? null,
      deliveryAddress: input.deliveryAddress ?? null,
    });

    await auditLogService.log({
      userId: order.userId,
      action: 'ORDER_STATUS_UPDATED',
      entity: 'orders',
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        from: order.orderStatus,
        to: nextStatus,
        updatedBy: input.updatedBy ?? 'admin',
        timestamp: new Date().toISOString(),
      },
    });

    if (nextStatus === OrderStatus.DELIVERED) {
      const loan = await loanService.activateFromApplication(order.applicationId, order.userId);

      await auditLogService.log({
        userId: order.userId,
        action: 'LOAN_ACTIVATED',
        entity: 'loan_accounts',
        metadata: {
          applicationNumber: order.application.id,
          loanAccountNumber: loan.loanAccountNumber,
          status: 'ACTIVE',
          orderNumber: order.orderNumber,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return buildTrackingPayload(updated);
  }
}

export const orderService = new OrderService();

export function resolveProductBrand(productId: string): string {
  return productBrand(productId);
}
