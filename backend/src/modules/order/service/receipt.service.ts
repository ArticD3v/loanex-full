import fs from 'node:fs';
import path from 'node:path';
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
import { STATUS_FLOW } from '../repository/order.repository';

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
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

function statusRank(status: string): number {
  return STATUS_FLOW.findIndex((value) => value === status);
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

export function buildOrderPayload(order: any) {
  const app = order.application || {};
  const payment = order.paymentTransaction;
  const productPrice = toNumber(app.sellingPrice || order.total_amount);
  const loanAmount = toNumber(app.loanAmount || order.total_amount);
  const downPayment = toNumber(app.downPayment || 0);
  const downPaymentPaid = isDownPaymentPaid(app.status, payment);
  const amountPaid = payment && payment.paymentStatus === PaymentStatus.SUCCESS
    ? toNumber(payment.amount)
    : 0;
  const remainingLoanAmount = Math.max(loanAmount, Math.max(0, productPrice - downPayment));
  const currentRank = statusRank(order.orderStatus || order.status || 'Pending');
  const canPayDownPayment = PAYABLE_DOWN_PAYMENT_STATUSES.includes(app.status) && !downPaymentPaid;

  const tenure = app.months || app.tenure || 6;
  const monthlyEmi = toNumber(app.monthlyEmi || app.regular_emi_amount || 0);
  const interestRate = toNumber(app.interestRate || 12.5);
  const processingFee = toNumber(app.service_charge || 0);

  const trackingStepIndex = currentRank < 0 ? 0 : currentRank;

  return {
    id: order.id,
    orderNumber: order.orderNumber ?? order.id,
    orderStatus: order.orderStatus || order.status || 'Pending',
    status: order.orderStatus || order.status || 'Pending',
    applicationId: order.applicationId ?? app.id ?? order.id,
    applicationNumber: order.applicationId ?? app.id ?? order.id,
    paymentId: payment?.id,
    paymentTransactionId: payment?.transactionId,
    transactionDate: payment?.createdAt ? new Date(payment.createdAt).toISOString() : null,
    paymentType: order.paymentMethod === 'FULL PAYMENT' || order.paymentMethod === 'FULL_PAYMENT' ? 'FULL PAYMENT' : 'EMI',
    paymentMethod: payment?.paymentMethod ?? order.paymentMethod ?? 'Razorpay',
    paymentStatus: payment?.paymentStatus ?? order.payment_status ?? 'Pending',
    productId: order.productId ?? app.productId ?? 'prod-1',
    productName: app.product?.name ?? app.productName ?? order.productName ?? 'Product',
    productBrand: productBrand(order.productId, app.brand),
    productImage: app.product?.image ?? app.productImage ?? productImagePath(order.productId),
    quantity: order.quantity ?? 1,
    items: order.items && order.items.length > 0 ? order.items.map((i: any) => ({
      productId: i.productId,
      productName: i.product?.name || i.productId,
      productBrand: productBrand(i.productId, i.product?.brand),
      productImage: i.product?.imageUrl || productImagePath(i.productId),
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })) : undefined,
    productPrice,
    loanAmount,
    downPayment,
    amountPaid,
    remainingLoanAmount,
    tenureMonths: tenure,
    monthlyEmi,
    interestRate,
    processingFee,
    gstPercent: 18,
    gstAmount: Math.round((processingFee * 18) / 100),
    totalPayableToday: downPayment + processingFee,
    shippingAddress: order.addressSnapshot?.fullAddress ?? order.deliveryAddress ?? null,
    courierPartner: order.courierPartner ?? 'Standard Delivery',
    trackingNumber: order.trackingNumber ?? `TRK-${Date.now()}`,
    estimatedDeliveryDate: order.estimatedDeliveryDate ?? new Date(Date.now() + 86400000 * 3).toISOString(),
    deliveryAddress: order.addressSnapshot?.fullAddress ?? order.deliveryAddress ?? null,
    warehouse: 'Main Warehouse',
    canPayDownPayment,
    downPaymentPaid,
    trackingSteps: STATUS_FLOW.map((s, index) => ({
      status: s,
      completed: index <= trackingStepIndex,
      current: index === trackingStepIndex,
    })),
    createdAt: order.createdAt ?? order.created_at ?? new Date().toISOString(),
    updatedAt: order.updatedAt ?? new Date().toISOString(),
    invoiceAvailable: true,
  };
}

export function buildTrackingPayload(order: any) {
  const payload = buildOrderPayload(order);
  return {
    orderId: payload.id,
    orderNumber: payload.orderNumber,
    orderStatus: payload.orderStatus,
    courierPartner: payload.courierPartner,
    trackingNumber: payload.trackingNumber,
    estimatedDeliveryDate: payload.estimatedDeliveryDate,
    trackingSteps: payload.trackingSteps,
  };
}

export async function generateOrderPdf(
  order: any,
  type: 'receipt' | 'invoice',
) {
  const folder = type === 'receipt' ? 'receipts' : 'invoices';
  const title = type === 'receipt' ? 'Payment Receipt' : 'Order Invoice';
  const fileName = `${type}_${order.id}_${Date.now()}.pdf`;
  const storageDir = path.join(process.cwd(), 'storage', folder);

  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const absolutePath = path.join(storageDir, fileName);
  const relativePath = path.join('storage', folder, fileName);
  const payload = buildOrderPayload(order);

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(absolutePath);
    doc.pipe(stream);

    doc.fontSize(20).fillColor('#0A2E6F').text(`LoanEx ${title}`);
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#111827');
    doc.text(`Order Number: ${payload.orderNumber}`);
    doc.text(`Application Number: ${payload.id}`);
    doc.text(`Payment ID: ${payload.paymentId ?? '—'}`);
    doc.text(`Product: ${payload.productName ?? payload.productId}`);
    doc.text(`Brand: ${payload.productBrand}`);
    doc.text(`Quantity: ${payload.quantity}`);
    doc.text(`Amount Paid: INR ${payload.amountPaid.toFixed(2)}`);
    doc.text(`Remaining Loan: INR ${payload.remainingLoanAmount.toFixed(2)}`);
    doc.text(`Status: ${payload.orderStatus}`);

    if (type === 'invoice') {
      doc.moveDown();
      doc.text(`Courier: ${payload.courierPartner ?? '—'}`);
      doc.text(`Tracking Number: ${payload.trackingNumber ?? '—'}`);
      doc.text(`Warehouse: ${payload.warehouse ?? '—'}`);
      doc.text(`Delivery Address: ${payload.deliveryAddress ?? '—'}`);
    }

    doc.moveDown();
    doc.fontSize(10).fillColor('#6B7280').text('System-generated document from LoanEx.');
    doc.end();

    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  return { absolutePath, relativePath };
}

export function generateOrderInvoicePdf(order: any) {
  return generateOrderPdf(order, 'invoice');
}

export function generateOrderReceiptPdf(order: any) {
  return generateOrderPdf(order, 'receipt');
}
