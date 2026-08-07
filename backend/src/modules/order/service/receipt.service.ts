import PDFDocument from 'pdfkit';

export enum EmiApplicationStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  DOWN_PAYMENT_PENDING = 'DOWN_PAYMENT_PENDING',
  DOWN_PAYMENT_COMPLETED = 'DOWN_PAYMENT_COMPLETED',
  ORDER_CONFIRMED = 'ORDER_CONFIRMED',
  ACTIVE_EMI = 'ACTIVE_EMI',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

import { STATUS_FLOW, type OrderStatusType } from '../repository/order.repository';

const BRAND = {
  primary: '#0A2E6F',
  secondary: '#D4A12A',
  ink: '#111827',
  muted: '#6B7280',
  line: '#E5E9F0',
  soft: '#F8FAFC',
  white: '#FFFFFF',
  success: '#16A34A',
};

const STEP_LABELS: Record<OrderStatusType, string> = {
  ORDER_CONFIRMED: 'Order Confirmed',
  PROCESSING: 'Processing',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
};

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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

export function productBrand(productId: string, fallback?: string | null): string {
  if (fallback) return fallback;
  const map: Record<string, string> = {
    'smartphone-iphone-15': 'Apple',
    'laptop-hp-pavilion-15': 'HP',
    'smart-tv-samsung-55': 'Samsung',
    'refrigerator-lg-260': 'LG',
    'washing-machine-bosch-7kg': 'Bosch',
    'ac-voltas-1-5ton': 'Voltas',
    'tablet-samsung-s9': 'Samsung',
    'smartwatch-apple-series-9': 'Apple',
  };
  return map[productId] ?? 'LoanEx';
}

function normalizeFlowStatus(raw: unknown): OrderStatusType {
  const value = String(raw ?? 'ORDER_CONFIRMED').toUpperCase().replace(/\s+/g, '_');
  if (value === 'CONFIRMED' || value === 'PENDING' || value === 'PLACED' || value === 'SUCCESS') {
    return 'ORDER_CONFIRMED';
  }
  if ((STATUS_FLOW as string[]).includes(value)) {
    return value as OrderStatusType;
  }
  return 'ORDER_CONFIRMED';
}

function statusRank(status: string): number {
  return STATUS_FLOW.findIndex((value) => value === normalizeFlowStatus(status));
}

const PAYABLE_DOWN_PAYMENT_STATUSES: EmiApplicationStatus[] = [
  EmiApplicationStatus.APPROVED,
  EmiApplicationStatus.OFFER_ACCEPTED,
  EmiApplicationStatus.DOWN_PAYMENT_PENDING,
];

const POST_DOWN_PAYMENT_STATUSES: EmiApplicationStatus[] = [
  EmiApplicationStatus.DOWN_PAYMENT_COMPLETED,
  EmiApplicationStatus.ORDER_CONFIRMED,
  EmiApplicationStatus.ACTIVE_EMI,
];

function isDownPaymentPaid(app: EmiApplicationStatus, payment: any) {
  return (
    Boolean(payment && payment.paymentStatus === PaymentStatus.SUCCESS) ||
    POST_DOWN_PAYMENT_STATUSES.includes(app)
  );
}

function resolvePaymentType(order: any): 'FULL PAYMENT' | 'EMI' {
  const method = String(order.paymentMethod ?? order.payment_method ?? '').toUpperCase();
  if (order.applicationId || method === 'EMI') return 'EMI';
  return 'FULL PAYMENT';
}

function resolveAmountPaid(order: any, app: any, payment: any, paymentType: string): number {
  if (payment && String(payment.paymentStatus).toUpperCase() === PaymentStatus.SUCCESS) {
    return toNumber(payment.amount);
  }

  const totalAmount = toNumber(
    order.totalAmount ?? order.total_amount ?? order.total ?? app.sellingPrice ?? 0,
  );

  if (paymentType === 'FULL PAYMENT') {
    const status = String(order.payment_status ?? order.orderStatus ?? order.status ?? '').toUpperCase();
    // Confirmed / paid full-payment orders should show order total, not ₹0.
    if (
      status.includes('CONFIRM') ||
      status === 'SUCCESS' ||
      status === 'PENDING' ||
      status === 'PAID' ||
      !status
    ) {
      return totalAmount;
    }
    return totalAmount;
  }

  const downPayment = toNumber(app.downPayment || 0);
  if (isDownPaymentPaid(app.status, payment)) return downPayment;
  return 0;
}

function buildTrackingSteps(order: any, createdAt: string) {
  const currentRank = Math.max(0, statusRank(order.orderStatus || order.status || 'ORDER_CONFIRMED'));
  return STATUS_FLOW.map((status, index) => {
    const completed = index <= currentRank;
    const active = index === currentRank;
    return {
      status,
      label: STEP_LABELS[status],
      completed,
      active,
      timestamp: index === 0 ? createdAt : null,
      remarks: active ? 'In progress' : completed ? 'Completed' : null,
      location: null,
      updatedBy: null,
    };
  });
}

export function buildOrderPayload(order: any) {
  const app = order.application || {};
  const payment = order.paymentTransaction;
  const paymentType = resolvePaymentType(order);
  const productPrice = toNumber(
    app.sellingPrice ??
      order.totalAmount ??
      order.total_amount ??
      order.total ??
      order.items?.[0]?.unitPrice ??
      0,
  );
  const loanAmount = toNumber(app.loanAmount ?? (paymentType === 'EMI' ? productPrice : 0));
  const downPayment = toNumber(app.downPayment || 0);
  const downPaymentPaid = isDownPaymentPaid(app.status, payment);
  const amountPaid = resolveAmountPaid(order, app, payment, paymentType);
  const remainingLoanAmount =
    paymentType === 'EMI' ? Math.max(0, loanAmount - (downPaymentPaid ? downPayment : 0)) : 0;
  const canPayDownPayment =
    paymentType === 'EMI' &&
    PAYABLE_DOWN_PAYMENT_STATUSES.includes(app.status) &&
    !downPaymentPaid;

  const tenure = app.months || app.tenure || 6;
  const monthlyEmi = toNumber(app.monthlyEmi || app.regular_emi_amount || 0);
  const interestRate = toNumber(app.interestRate || 12.5);
  const processingFee = toNumber(app.service_charge || 0);
  const createdAt = order.createdAt ?? order.created_at ?? new Date().toISOString();
  const shippingAddress =
    order.addressSnapshot?.fullAddress ??
    order.deliveryAddress ??
    order.shippingAddress ??
    null;
  const trackingSteps = buildTrackingSteps(order, createdAt);
  const flowStatus = normalizeFlowStatus(order.orderStatus || order.status);
  const displayStatus =
    paymentType === 'FULL PAYMENT' && flowStatus === 'ORDER_CONFIRMED'
      ? 'CONFIRMED'
      : order.orderStatus || order.status || flowStatus;

  const items =
    order.items && order.items.length > 0
      ? order.items.map((i: any) => ({
          productId: i.productId,
          productName: i.product?.name || i.productName || i.productId,
          productBrand: productBrand(i.productId, i.product?.brand),
          productImage: i.product?.imageUrl || productImagePath(i.productId),
          quantity: i.quantity ?? 1,
          unitPrice: toNumber(i.unitPrice ?? productPrice),
        }))
      : undefined;

  return {
    id: order.id,
    orderNumber: order.orderNumber ?? (order.id ? `ORD-${String(order.id).slice(0, 8).toUpperCase()}` : 'ORD-0000'),
    orderStatus: displayStatus,
    status: displayStatus,
    applicationId: order.applicationId ?? app.id ?? null,
    applicationNumber: order.applicationId ?? app.applicationNumber ?? app.id ?? null,
    paymentId: payment?.id ?? null,
    paymentTransactionId: payment?.transactionId ?? payment?.id ?? null,
    transactionDate: payment?.createdAt ? new Date(payment.createdAt).toISOString() : createdAt,
    paymentType,
    paymentMethod: paymentType === 'FULL PAYMENT' ? 'FULL PAYMENT' : (payment?.paymentMethod ?? 'EMI'),
    paymentStatus: payment?.paymentStatus ?? order.payment_status ?? 'SUCCESS',
    productId: order.productId ?? app.productId ?? items?.[0]?.productId ?? 'prod-1',
    productName:
      app.product?.name ?? app.productName ?? order.productName ?? items?.[0]?.productName ?? 'Product',
    productBrand: productBrand(order.productId, app.brand ?? items?.[0]?.productBrand),
    productImage:
      app.product?.image ?? app.productImage ?? items?.[0]?.productImage ?? productImagePath(order.productId),
    quantity: order.quantity ?? items?.[0]?.quantity ?? 1,
    items,
    productPrice,
    loanAmount,
    downPayment,
    amountPaid,
    remainingLoanAmount,
    approvedLoanAmount: loanAmount,
    approvedDownPayment: downPayment,
    tenureMonths: tenure,
    monthlyEmi,
    interestRate,
    processingFee,
    gstPercent: 18,
    gstAmount: Math.round((processingFee * 18) / 100),
    totalPayableToday: paymentType === 'EMI' ? downPayment + processingFee : amountPaid,
    shippingAddress,
    billingAddress: shippingAddress,
    courierPartner: order.courierPartner ?? 'Standard Delivery',
    trackingNumber: order.trackingNumber ?? `TRK-${String(order.id ?? Date.now()).replace(/-/g, '').slice(-13)}`,
    estimatedDeliveryDate:
      order.estimatedDeliveryDate ?? new Date(Date.now() + 86400000 * 3).toISOString(),
    deliveryAddress: shippingAddress,
    canPayDownPayment,
    downPaymentPaid,
    canOpenEmiDashboard: paymentType === 'EMI' && downPaymentPaid,
    customer: order.user
      ? {
          fullName: order.user.fullName ?? 'Customer',
          email: order.user.email ?? '',
          mobile: order.user.mobile ?? '',
        }
      : null,
    emi:
      paymentType === 'EMI'
        ? {
            loanAmount,
            downPayment,
            tenure,
            monthlyEmi,
            interestRate,
            processingFee,
          }
        : undefined,
    timeline: {
      applicationApproved: true,
      offerAccepted: true,
      downPaymentCompleted: paymentType === 'FULL PAYMENT' || downPaymentPaid,
      orderConfirmed: true,
      processing: statusRank(flowStatus) >= 1,
      packed: statusRank(flowStatus) >= 2,
      shipped: statusRank(flowStatus) >= 3,
      outForDelivery: statusRank(flowStatus) >= 4,
      delivered: statusRank(flowStatus) >= 5,
    },
    trackingSteps,
    steps: trackingSteps,
    trackingEvents: [],
    createdAt,
    updatedAt: order.updatedAt ?? order.updated_at ?? createdAt,
    receiptAvailable: true,
    invoiceAvailable: true,
  };
}

export function buildTrackingPayload(order: any) {
  const payload = buildOrderPayload(order);
  return {
    ...payload,
    orderId: payload.id,
    steps: payload.steps,
    trackingSteps: payload.trackingSteps,
    trackingEvents: payload.trackingEvents,
    courierPartner: payload.courierPartner,
    trackingNumber: payload.trackingNumber,
    estimatedDeliveryDate: payload.estimatedDeliveryDate,
  };
}

function formatInr(amount: number): string {
  return `INR ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function generateOrderPdfBuffer(
  order: any,
  type: 'receipt' | 'invoice',
): Promise<Buffer> {
  const payload = buildOrderPayload(order);
  const title = type === 'receipt' ? 'Payment Receipt' : 'Tax Invoice';

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 48,
      size: 'A4',
      info: {
        Title: `${title} ${payload.orderNumber}`,
        Author: 'LoanEx',
        Subject: `LoanEx ${title}`,
      },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const left = 48;
    const right = pageWidth - 48;
    const contentWidth = right - left;

    // Brand header bar
    doc.rect(0, 0, pageWidth, 72).fill(BRAND.primary);
    doc.fillColor(BRAND.white).font('Helvetica-Bold').fontSize(22).text('LOANEX', left, 22, {
      width: contentWidth * 0.55,
    });
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#D5E1F5')
      .text('Smart shopping. Flexible EMI.', left, 48, { width: contentWidth * 0.55 });

    doc
      .fillColor(BRAND.secondary)
      .font('Helvetica-Bold')
      .fontSize(14)
      .text(title.toUpperCase(), left + contentWidth * 0.45, 28, {
        width: contentWidth * 0.55,
        align: 'right',
      });

    let y = 96;

    // Meta card
    doc.roundedRect(left, y, contentWidth, 78, 8).fill(BRAND.soft);
    doc.roundedRect(left, y, contentWidth, 78, 8).strokeColor(BRAND.line).lineWidth(1).stroke();

    doc.fillColor(BRAND.muted).font('Helvetica').fontSize(9).text('ORDER NUMBER', left + 16, y + 14);
    doc
      .fillColor(BRAND.primary)
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(String(payload.orderNumber), left + 16, y + 28);

    doc.fillColor(BRAND.muted).font('Helvetica').fontSize(9).text('ORDER DATE', left + 220, y + 14);
    doc
      .fillColor(BRAND.ink)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(
        new Date(payload.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        left + 220,
        y + 28,
      );

    doc.fillColor(BRAND.muted).font('Helvetica').fontSize(9).text('STATUS', left + 370, y + 14);
    doc
      .fillColor(BRAND.success)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(String(payload.orderStatus).replaceAll('_', ' '), left + 370, y + 28);

    doc.fillColor(BRAND.muted).font('Helvetica').fontSize(9).text('PAYMENT', left + 16, y + 50);
    doc
      .fillColor(BRAND.ink)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(String(payload.paymentType), left + 70, y + 48);

    y += 100;

    // Customer / shipping
    doc.fillColor(BRAND.primary).font('Helvetica-Bold').fontSize(12).text('Bill To', left, y);
    doc.text('Ship To', left + contentWidth / 2 + 8, y);
    y += 18;
    doc.fillColor(BRAND.ink).font('Helvetica').fontSize(10);
    const customerName = payload.customer?.fullName ?? 'Customer';
    const customerLine = [payload.customer?.email, payload.customer?.mobile].filter(Boolean).join(' · ');
    doc.text(customerName, left, y, { width: contentWidth / 2 - 12 });
    doc.text(payload.shippingAddress ?? payload.deliveryAddress ?? '—', left + contentWidth / 2 + 8, y, {
      width: contentWidth / 2 - 12,
    });
    if (customerLine) {
      doc.fillColor(BRAND.muted).text(customerLine, left, y + 14, { width: contentWidth / 2 - 12 });
    }

    y += 52;

    // Items table header
    doc.rect(left, y, contentWidth, 26).fill(BRAND.primary);
    doc.fillColor(BRAND.white).font('Helvetica-Bold').fontSize(9);
    doc.text('ITEM', left + 12, y + 8);
    doc.text('QTY', left + contentWidth - 180, y + 8, { width: 40, align: 'right' });
    doc.text('UNIT PRICE', left + contentWidth - 130, y + 8, { width: 70, align: 'right' });
    doc.text('AMOUNT', left + contentWidth - 55, y + 8, { width: 43, align: 'right' });
    y += 26;

    const lineItems =
      payload.items && payload.items.length > 0
        ? payload.items
        : [
            {
              productName: payload.productName,
              productBrand: payload.productBrand,
              quantity: payload.quantity,
              unitPrice: payload.productPrice,
            },
          ];

    let subtotal = 0;
    lineItems.forEach((item: any, index: number) => {
      const qty = Number(item.quantity ?? 1);
      const unit = toNumber(item.unitPrice);
      const lineTotal = qty * unit;
      subtotal += lineTotal;
      if (index % 2 === 0) {
        doc.rect(left, y, contentWidth, 36).fill('#FFFFFF');
      } else {
        doc.rect(left, y, contentWidth, 36).fill(BRAND.soft);
      }
      doc
        .strokeColor(BRAND.line)
        .lineWidth(0.5)
        .moveTo(left, y + 36)
        .lineTo(right, y + 36)
        .stroke();

      doc.fillColor(BRAND.ink).font('Helvetica-Bold').fontSize(10).text(String(item.productName ?? 'Product'), left + 12, y + 8, {
        width: contentWidth - 210,
      });
      if (item.productBrand) {
        doc.fillColor(BRAND.muted).font('Helvetica').fontSize(8).text(String(item.productBrand), left + 12, y + 22, {
          width: contentWidth - 210,
        });
      }
      doc.fillColor(BRAND.ink).font('Helvetica').fontSize(10);
      doc.text(String(qty), left + contentWidth - 180, y + 12, { width: 40, align: 'right' });
      doc.text(formatInr(unit), left + contentWidth - 130, y + 12, { width: 70, align: 'right' });
      doc.font('Helvetica-Bold').text(formatInr(lineTotal), left + contentWidth - 55, y + 12, {
        width: 43,
        align: 'right',
      });
      y += 36;
    });

    y += 16;

    // Totals
    const totalsX = left + contentWidth - 220;
    doc.fillColor(BRAND.muted).font('Helvetica').fontSize(10);
    doc.text('Subtotal', totalsX, y, { width: 100 });
    doc.fillColor(BRAND.ink).text(formatInr(subtotal || payload.productPrice), totalsX + 100, y, {
      width: 120,
      align: 'right',
    });
    y += 16;
    doc.fillColor(BRAND.muted).text('Payment Type', totalsX, y, { width: 100 });
    doc.fillColor(BRAND.ink).text(String(payload.paymentType), totalsX + 100, y, {
      width: 120,
      align: 'right',
    });
    y += 20;
    doc.rect(totalsX, y, 220, 32).fill(BRAND.secondary);
    doc
      .fillColor(BRAND.primary)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('Amount Paid', totalsX + 12, y + 10);
    doc.text(formatInr(payload.amountPaid || subtotal || payload.productPrice), totalsX + 100, y + 10, {
      width: 108,
      align: 'right',
    });

    y += 52;

    if (type === 'invoice') {
      doc.fillColor(BRAND.primary).font('Helvetica-Bold').fontSize(11).text('Delivery', left, y);
      y += 16;
      doc.fillColor(BRAND.ink).font('Helvetica').fontSize(10);
      doc.text(`Courier: ${payload.courierPartner ?? 'Standard Delivery'}`, left, y);
      y += 14;
      doc.text(`Tracking: ${payload.trackingNumber ?? '—'}`, left, y);
      y += 14;
      doc.text(
        `Est. delivery: ${
          payload.estimatedDeliveryDate
            ? new Date(payload.estimatedDeliveryDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : '—'
        }`,
        left,
        y,
      );
      y += 24;
    }

    // Footer
    doc
      .moveTo(left, Math.max(y, doc.page.height - 72))
      .lineTo(right, Math.max(y, doc.page.height - 72))
      .strokeColor(BRAND.line)
      .stroke();
    doc
      .fillColor(BRAND.muted)
      .font('Helvetica')
      .fontSize(8)
      .text(
        'This is a system-generated LoanEx document. For support visit mrloanex.com or contact Support from your account.',
        left,
        doc.page.height - 60,
        { width: contentWidth, align: 'center' },
      );

    doc.end();
  });
}

export async function generateOrderInvoicePdf(order: any) {
  const buffer = await generateOrderPdfBuffer(order, 'invoice');
  return {
    buffer,
    relativePath: `invoices/${order.id}-invoice.pdf`,
  };
}

export async function generateOrderReceiptPdf(order: any) {
  const buffer = await generateOrderPdfBuffer(order, 'receipt');
  return {
    buffer,
    relativePath: `receipts/${order.id}-receipt.pdf`,
  };
}
