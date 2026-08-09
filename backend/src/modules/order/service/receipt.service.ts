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

export type OrderTracking = any;
import { env } from '../../../config/env';
import {
  resolveProductBrand,
  resolveProductImage,
} from '../../../common/utils/product-assets';
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

const STEP_LABELS: Record<string, string> = {
  PENDING: 'Order Placed',
  ORDER_CONFIRMED: 'Order Confirmed',
  PROCESSING: 'Processing',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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

function resolvePaymentType(order: any): 'FULL PAYMENT' | 'EMI' | 'COD' {
  const method = String(order.paymentMethod ?? order.payment_method ?? '').toUpperCase();
  if (order.applicationId || method === 'EMI') return 'EMI';
  if (method === 'COD' || method === 'CASH_ON_DELIVERY') return 'COD';
  return 'FULL PAYMENT';
}

function resolveAmountPaid(order: any, app: any, payment: any): number {
  if (payment && String(payment.paymentStatus).toUpperCase() === PaymentStatus.SUCCESS) {
    return toNumber(payment.amount);
  }
  const totalAmount = toNumber(
    order.totalAmount ?? order.total_amount ?? order.total ?? app.sellingPrice ?? 0,
  );
  // Confirmed / paid full-payment orders should show order total, not ₹0.
  return totalAmount;
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

/**
 * Effective EMI status for a schedule row: stored PAID/FAILED/OVERDUE win,
 * otherwise a PENDING row whose due date has passed becomes OVERDUE. Mirrors
 * loan-payload.service's effectiveStatus so every surface (admin ledger,
 * order details, invoices) shows the true repayment runway.
 */
/**
 * Real collected amount for a schedule row: paidAmount when money was taken,
 * else the EMI amount. A stored paidAmount of 0 (unpaid rows) must never
 * blank the amount out (0 ?? emiAmount picks 0).
 */
export function emiRowAmount(row: any): number {
  const paid = toNumber(row?.paidAmount);
  return paid > 0 ? paid : toNumber(row?.emiAmount);
}

export function effectiveEmiPaymentStatus(row: any, asOf: Date = new Date()): string {
  const raw = String(row?.paymentStatus ?? row?.payment_status ?? 'PENDING').toUpperCase();
  if (raw === 'PAID' || raw === 'FAILED' || raw === 'OVERDUE' || raw === 'PARTIAL') return raw;
  const due = row?.dueDate ? new Date(row.dueDate) : null;
  if (
    due &&
    !Number.isNaN(due.getTime()) &&
    due.getTime() < asOf.getTime() &&
    raw === 'PENDING'
  ) {
    return 'OVERDUE';
  }
  return raw;
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
  // Real loan + EMI ledger drives every EMI number — the application row only
  // holds requested/estimated terms, while the loanAccount + emi_schedules hold
  // the approved truth (and change as EMIs are paid).
  const loan = order.loan ?? null;
  const schedules = Array.isArray(order.emiSchedules) ? order.emiSchedules : [];
  const paidSchedules = schedules.filter(
    (s: any) => String(s.paymentStatus ?? '').toUpperCase() === 'PAID',
  );
  const emiCollected = paidSchedules.reduce(
    (sum: number, s: any) => sum + emiRowAmount(s),
    0,
  );
  const loanAmount = toNumber(
    loan?.loanAmount ??
      app.approvedAmount ??
      app.loanAmount ??
      app.requestedAmount ??
      (paymentType === 'EMI' ? productPrice : 0),
  );
  const downPayment = toNumber(
    app.approvedDownPayment ?? app.requestedDownPayment ?? app.downPayment ?? 0,
  );
  const downPaymentPaid = isDownPaymentPaid(app.status, payment);
  const dpCollected =
    payment && String(payment.paymentStatus).toUpperCase() === PaymentStatus.SUCCESS
      ? toNumber(payment.amount)
      : 0;
  // EMI: collected down-payment transaction plus every paid EMI — computed live
  // from the ledger so the value grows as EMIs are paid (never static).
  const amountPaid =
    paymentType === 'FULL PAYMENT'
      ? resolveAmountPaid(order, app, payment)
      : paymentType === 'COD'
        ? payment && String(payment.paymentStatus).toUpperCase() === PaymentStatus.SUCCESS
          ? toNumber(payment.amount)
          : 0
        : Math.round((dpCollected + emiCollected) * 100) / 100;
  // COD cash is collected at delivery — expose when that happened so receipts
  // and the admin ledger can say 'Paid at delivery on <date>'.
  const paidAtDelivery =
    paymentType === 'COD' &&
    payment &&
    String(payment.paymentStatus).toUpperCase() === PaymentStatus.SUCCESS
      ? payment.paidAt ?? payment.createdAt ?? null
      : null;
  const remainingLoanAmount =
    paymentType === 'EMI'
      ? loan
        ? toNumber(loan.outstandingAmount ?? 0)
        : Math.max(0, loanAmount - (downPaymentPaid ? downPayment : 0))
      : 0;
  const canPayDownPayment =
    paymentType === 'EMI' &&
    PAYABLE_DOWN_PAYMENT_STATUSES.includes(app.status) &&
    !downPaymentPaid;

  const tenure =
    toNumber(
      loan?.loanTenure ??
        app.approvedTenure ??
        app.tenure ??
        app.months ??
        app.requestedTenure ??
        0,
    ) || null;
  const monthlyEmi = toNumber(
    loan?.emiAmount ??
      app.monthlyEmi ??
      app.estimatedMonthlyEmi ??
      app.regular_emi_amount ??
      0,
  );
  const interestRate = toNumber(loan?.interestRate ?? app.interestRate ?? 0);
  const processingFee = toNumber(
    loan?.processingFee ?? app.processingFee ?? app.service_charge ?? 0,
  );
  const loanStatus = loan?.loanStatus ?? null;
  const nextEmiDueDate =
    loan?.nextEmiDueDate ??
    schedules.find((s: any) => String(s.paymentStatus ?? '').toUpperCase() !== 'PAID')
      ?.dueDate ??
    null;
  const gstPercent = env.GST_PERCENT;
  const gstAmount = processingFee > 0 ? Math.round((processingFee * gstPercent) / 100) : 0;
  const totalPayableToday = Math.round((downPayment + processingFee + gstAmount) * 100) / 100;
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
          productBrand: resolveProductBrand(i.productId, i.product?.brand),
          productImage: i.product?.imageUrl || resolveProductImage(i.productId),
          quantity: i.quantity ?? 1,
          unitPrice: toNumber(i.unitPrice ?? productPrice),
          variantId: i.variantId ?? null,
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
    paymentMethod:
      paymentType === 'FULL PAYMENT'
        ? 'FULL PAYMENT'
        : paymentType === 'COD'
          ? 'COD'
          : (payment?.paymentMethod ?? 'EMI'),
    paymentStatus: payment?.paymentStatus ?? order.payment_status ?? 'SUCCESS',
    productId: order.productId ?? app.productId ?? items?.[0]?.productId ?? 'prod-1',
    productName:
      app.product?.name ?? app.productName ?? order.productName ?? items?.[0]?.productName ?? 'Product',
    productBrand: resolveProductBrand(order.productId, app.brand ?? items?.[0]?.productBrand),
    productImage:
      app.product?.image ?? app.productImage ?? items?.[0]?.productImage ?? resolveProductImage(order.productId),
    quantity: order.quantity ?? items?.[0]?.quantity ?? 1,
    items,
    productPrice,
    loanAmount,
    downPayment,
    // Only EMI orders have a down payment — COD collection is reported via
    // amountPaid/paidAtDelivery instead.
    downPaymentCollected: paymentType === 'EMI' ? dpCollected : 0,
    amountPaid,
    paidAtDelivery,
    remainingLoanAmount,
    approvedLoanAmount: loanAmount,
    approvedDownPayment: downPayment,
    tenureMonths: tenure,
    monthlyEmi,
    interestRate,
    processingFee,
    loanStatus,
    loanAccountNumber: loan?.loanAccountNumber ?? null,
    paidEmiCount: paidSchedules.length,
    totalEmiCount: schedules.length,
    nextEmiDueDate,
    emiPayments: paidSchedules.map((s: any) => ({
      emiNumber: s.emiNumber,
      dueDate: s.dueDate ?? null,
      paidAt: s.paidAt ?? null,
      principalAmount: toNumber(s.principalAmount),
      interestAmount: toNumber(s.interestAmount),
      amount: emiRowAmount(s),
    })),
    // Full loan schedule — paid rows carry paidAt/PAID, upcoming rows stay
    // PENDING/OVERDUE so every surface can show the remaining installments
    // with due dates and amounts next to the paid history.
    emiSchedule: schedules.map((s: any) => ({
      emiNumber: s.emiNumber,
      dueDate: s.dueDate ?? null,
      principalAmount: toNumber(s.principalAmount),
      interestAmount: toNumber(s.interestAmount),
      amount: emiRowAmount(s),
      paymentStatus: effectiveEmiPaymentStatus(s),
      paidAt: s.paidAt ?? null,
    })),
    gstPercent,
    gstAmount,
    totalPayableToday: paymentType === 'EMI' ? downPayment + processingFee : amountPaid,
    shippingAddress,
    billingAddress: shippingAddress,
    // Real fulfillment fields only — never fabricate courier/tracking/warehouse
    // placeholders. Operations fill these through the admin status update.
    courierPartner: order.courierPartner ?? null,
    trackingNumber: order.trackingNumber ?? null,
    estimatedDeliveryDate: order.estimatedDeliveryDate ?? null,
    deliveryAddress: shippingAddress,
    warehouse: order.warehouse ?? null,
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
            monthlyEmi: monthlyEmi || null,
            // Only surface a rate when one actually exists — don't leak a
            // default into FULL PAYMENT order payloads.
            interestRate: interestRate ? interestRate : null,
            processingFee: processingFee || null,
            loanStatus,
            loanAccountNumber: loan?.loanAccountNumber ?? null,
            paidEmiCount: paidSchedules.length,
            totalEmiCount: schedules.length,
            nextEmiDueDate,
            remainingLoanAmount,
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

    // COD cash is collected at delivery — state it explicitly with the date.
    if (payload.paidAtDelivery) {
      doc
        .fillColor(BRAND.primary)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(
          `Paid at delivery on ${new Date(payload.paidAtDelivery).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}`,
          left,
          y,
        );
      y += 18;
    }

    if (type === 'invoice' && payload.paymentType === 'EMI') {
      // EMI loan summary — dynamic from the loan ledger + paid installments,
      // so the document reflects every payment actually collected.
      y += 4;
      doc.fillColor(BRAND.primary).font('Helvetica-Bold').fontSize(12).text('EMI Loan Summary', left, y);
      y += 16;
      const emiRows: Array<[string, string]> = [
        ['Loan Account', payload.loanAccountNumber || '—'],
        ['Loan Status', String(payload.loanStatus || '—').replaceAll('_', ' ')],
        ['Loan Amount', formatInr(payload.emi?.loanAmount || 0)],
        ['Down Payment', formatInr(payload.emi?.downPayment || 0)],
        ['Tenure', payload.emi?.tenure ? `${payload.emi.tenure} months` : '—'],
        ['Monthly EMI', payload.emi?.monthlyEmi ? formatInr(payload.emi.monthlyEmi) : '—'],
        ['Interest Rate', payload.emi?.interestRate ? `${payload.emi.interestRate}% p.a.` : '—'],
        ['Processing Fee', payload.emi?.processingFee ? formatInr(payload.emi.processingFee) : '—'],
      ];
      emiRows.forEach(([label, value], i) => {
        if (i % 2 === 0) doc.rect(left, y, contentWidth, 18).fill('#FFFFFF');
        else doc.rect(left, y, contentWidth, 18).fill(BRAND.soft);
        doc.fillColor(BRAND.muted).font('Helvetica').fontSize(9).text(label, left + 12, y + 5);
        doc
          .fillColor(BRAND.ink)
          .font('Helvetica-Bold')
          .fontSize(9)
          .text(value, left + 150, y + 5, { width: contentWidth - 162, align: 'right' });
        y += 18;
      });

      y += 10;
      const paidCount = Number(payload.paidEmiCount ?? 0);
      const totalCount = Number(payload.totalEmiCount ?? 0);
      doc
        .fillColor(BRAND.primary)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(`Installments Paid: ${paidCount} / ${totalCount || '—'}`, left, y);
      y += 15;
      if (payload.nextEmiDueDate) {
        doc
          .fillColor(BRAND.muted)
          .font('Helvetica')
          .fontSize(9)
          .text(
            `Next EMI due: ${new Date(payload.nextEmiDueDate).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}`,
            left,
            y,
          );
        y += 14;
      }
      doc
        .fillColor(BRAND.muted)
        .font('Helvetica')
        .fontSize(9)
        .text(`Amount paid to date: ${formatInr(payload.amountPaid || 0)}`, left, y);
      y += 14;
      doc
        .fillColor(BRAND.muted)
        .font('Helvetica')
        .fontSize(9)
        .text(`Remaining balance: ${formatInr(payload.remainingLoanAmount || 0)}`, left, y);
      y += 20;

      // Payment history — only rows that were actually collected.
      const paidEmis: any[] = payload.emiPayments || [];
      if (paidEmis.length > 0 || payload.downPaymentCollected > 0) {
        doc.fillColor(BRAND.primary).font('Helvetica-Bold').fontSize(11).text('Payment History', left, y);
        y += 16;
        doc.rect(left, y, contentWidth, 22).fill(BRAND.primary);
        doc.fillColor(BRAND.white).font('Helvetica-Bold').fontSize(9);
        doc.text('PAYMENT', left + 12, y + 7);
        doc.text('DATE', left + 150, y + 7, { width: 90, align: 'right' });
        doc.text('AMOUNT', left + contentWidth - 55, y + 7, { width: 43, align: 'right' });
        y += 22;
        const rows: Array<{ label: string; date: string | null; amount: number }> = [];
        if (payload.downPaymentCollected > 0) {
          rows.push({
            label: 'Down Payment',
            date: payload.transactionDate ?? null,
            amount: toNumber(payload.downPaymentCollected),
          });
        }
        for (const p of paidEmis) {
          rows.push({
            label: `EMI #${p.emiNumber}`,
            date: p.paidAt ?? p.dueDate ?? null,
            amount: toNumber(p.amount),
          });
        }
        rows.forEach((r, i) => {
          if (i % 2 === 0) doc.rect(left, y, contentWidth, 22).fill('#FFFFFF');
          else doc.rect(left, y, contentWidth, 22).fill(BRAND.soft);
          doc
            .strokeColor(BRAND.line)
            .lineWidth(0.5)
            .moveTo(left, y + 22)
            .lineTo(right, y + 22)
            .stroke();
          doc.fillColor(BRAND.ink).font('Helvetica').fontSize(9).text(r.label, left + 12, y + 6);
          doc
            .font('Helvetica')
            .text(
              r.date
                ? new Date(r.date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—',
              left + 150,
              y + 6,
              { width: 90, align: 'right' },
            );
          doc
            .font('Helvetica-Bold')
            .text(formatInr(r.amount), left + contentWidth - 55, y + 6, { width: 43, align: 'right' });
          y += 22;
        });
        y += 16;
      }
    }

    if (type === 'invoice') {
      doc.fillColor(BRAND.primary).font('Helvetica-Bold').fontSize(11).text('Delivery', left, y);
      y += 16;
      doc.fillColor(BRAND.ink).font('Helvetica').fontSize(10);
      doc.text(`Courier: ${payload.courierPartner ?? '—'}`, left, y);
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
