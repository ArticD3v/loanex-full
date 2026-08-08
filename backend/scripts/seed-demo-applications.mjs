import fs from 'node:fs';
import path from 'node:path';

// Synthetic demo identity — never real customer PII.
const USER_ID = '11111111-1111-4111-8111-111111111111';
const DEMO_PHONE = '9000000000';
const OUT = path.resolve('..', 'supabase-emi-demo.sql');
const NOW = '2026-08-06T10:00:00.000Z';

const P = {
  pending: { id: 'id_1786019829213_it8zhh', name: 'Dell Book 9 Ultra', price: 18156 },
  review: { id: 'id_1786019829235_wknmq3', name: 'Asus Phone 12 Ultra', price: 103907 },
  offer: { id: 'id_1786019829220_m9zp6h', name: 'Apple Studio 11 Max', price: 35885 },
  modified: { id: 'id_1786019829216_7tq64k', name: 'Lenovo Book 9 Pro', price: 64117 },
  accepted: { id: 'id_1786019829258_3menbe', name: 'OnePlus Book 1 Lite', price: 48722 },
  dpDone: { id: 'id_1786019829248_gzgh5h', name: 'Asus Pad 3 Ultra', price: 65804 },
  ordered: { id: 'id_1786019829231_j709j4', name: 'Apple Vision 15 Essential', price: 31695 },
  active: { id: 'id_1786019829238_dp8xeo', name: 'Samsung Tab 12 Advanced', price: 75740 },
  rejected: { id: 'id_1786019829227_w0fwt4', name: 'LG Book 14 Advanced', price: 80077 },
  declined: { id: 'id_1786019829229_0x214g', name: 'OnePlus Vision 10 Advanced', price: 65806 },
};

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function calcEmi(principal, annualRatePercent, months) {
  const r = annualRatePercent / 12 / 100;
  if (r === 0 || months <= 0) return round2(principal / Math.max(1, months));
  const f = Math.pow(1 + r, months);
  return round2((principal * r * f) / (f - 1));
}

function buildSchedule(principal, annualRatePercent, months, startISO) {
  const r = annualRatePercent / 12 / 100;
  const emi = calcEmi(principal, annualRatePercent, months);
  let balance = principal;
  const rows = [];
  let totalInterest = 0;
  const start = new Date(startISO);
  for (let i = 1; i <= months; i += 1) {
    const interest = round2(balance * r);
    let pr = round2(emi - interest);
    let amount = emi;
    if (i === months || pr > balance) {
      pr = round2(balance);
      amount = round2(pr + interest);
    }
    balance = round2(Math.max(0, balance - pr));
    totalInterest = round2(totalInterest + interest);
    const due = new Date(start);
    due.setMonth(start.getMonth() + i);
    rows.push({
      emiNumber: i,
      dueDate: due.toISOString(),
      principalAmount: pr,
      interestAmount: interest,
      emiAmount: amount,
      remainingBalance: balance,
    });
  }
  return { emi, totalInterest, totalPayable: round2(principal + totalInterest), rows };
}

const q = (v) => {
  if (v === null || v === undefined) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
};

const apps = [];

function makeApp(rec) {
  const price = rec.price ?? rec.product.price;
  const requestedAmount = round2(price * rec.loanPct);
  const requestedDownPayment = round2(price * rec.dpPct);
  const estimatedMonthlyEmi = calcEmi(requestedAmount, rec.rate, rec.tenure);
  const approved =
    ['APPROVED', 'OFFER_ACCEPTED', 'ORDER_CONFIRMED', 'DOWN_PAYMENT_COMPLETED', 'ACTIVE_EMI'].includes(rec.status);
  const row = {
    id: rec.id,
    applicationNumber: rec.appNumber,
    userId: USER_ID,
    productId: rec.product.id,
    productName: rec.product.name,
    sellingPrice: price,
    requestedAmount,
    requestedDownPayment,
    requestedTenure: rec.tenure,
    estimatedMonthlyEmi,
    approvedAmount: approved ? round2((rec.approvedPct ?? rec.loanPct) * price) : null,
    approvedTenure: approved ? (rec.approvedTenure ?? rec.tenure) : null,
    approvedDownPayment: approved ? round2((rec.approvedDpPct ?? rec.dpPct) * price) : null,
    monthlyEmi: approved ? calcEmi((rec.approvedPct ?? rec.loanPct) * price, rec.rate, rec.approvedTenure ?? rec.tenure) : null,
    interestRate: approved ? rec.rate : null,
    processingFee: approved ? (rec.fee ?? 0) : null,
    status: rec.status,
    adminRemarks: rec.adminRemarks ?? null,
    rejectionReason: rec.rejectionReason ?? null,
    submittedAt: rec.createdAt,
    reviewedAt: rec.reviewedAt ?? null,
    termsModifiedAt: rec.termsModifiedAt ?? null,
    offerAcceptedAt: rec.offerAcceptedAt ?? null,
    offerDeclinedAt: rec.offerDeclinedAt ?? null,
    createdAt: rec.createdAt,
    updatedAt: rec.createdAt,
  };
  apps.push(row);
}

makeApp({
  id: 'demo-emi-pending-0010', appNumber: 'LX-EMI-20260806-0010', status: 'PENDING',
  product: P.pending, dpPct: 0.2, loanPct: 0.8, tenure: 9, rate: 11.5,
  createdAt: '2026-08-06T10:00:00.000Z',
});
makeApp({
  id: 'demo-emi-review-0009', appNumber: 'LX-EMI-20260806-0009', status: 'UNDER_REVIEW',
  product: P.review, dpPct: 0.2, loanPct: 0.8, tenure: 12, rate: 12.5,
  createdAt: '2026-08-06T09:00:00.000Z', reviewedAt: '2026-08-06T09:15:00.000Z',
});
makeApp({
  id: 'demo-emi-offer-0008', appNumber: 'LX-EMI-20260805-0008', status: 'APPROVED',
  product: P.offer, dpPct: 0.2, loanPct: 0.8, tenure: 9, rate: 11.5, fee: 350,
  adminRemarks: 'Offer approved as requested.',
  createdAt: '2026-08-05T16:00:00.000Z', reviewedAt: '2026-08-05T16:30:00.000Z',
});
makeApp({
  id: 'demo-emi-modified-0007', appNumber: 'LX-EMI-20260805-0007', status: 'APPROVED',
  product: P.modified, dpPct: 0.2, loanPct: 0.8, tenure: 12, rate: 12.5,
  approvedDpPct: 0.35, approvedPct: 0.65, approvedTenure: 6, fee: 999,
  adminRemarks: 'Revised offer: higher down payment and processing fee required.',
  termsModifiedAt: '2026-08-06T08:00:00.000Z',
  createdAt: '2026-08-05T12:00:00.000Z', reviewedAt: '2026-08-05T13:00:00.000Z',
});
makeApp({
  id: 'demo-emi-accepted-0006', appNumber: 'LX-EMI-20260804-0006', status: 'OFFER_ACCEPTED',
  product: P.accepted, dpPct: 0.25, loanPct: 0.75, tenure: 9, rate: 11.5, fee: 399,
  adminRemarks: 'Offer accepted - down payment pending.',
  offerAcceptedAt: '2026-08-04T14:30:00.000Z',
  createdAt: '2026-08-03T10:00:00.000Z', reviewedAt: '2026-08-03T12:00:00.000Z',
});
makeApp({
  id: 'demo-emi-dpdone-0005', appNumber: 'LX-EMI-20260801-0005', status: 'DOWN_PAYMENT_COMPLETED',
  product: P.dpDone, dpPct: 0.3, loanPct: 0.7, tenure: 12, rate: 12.5, fee: 499,
  adminRemarks: 'Down payment received. Awaiting order confirmation.',
  createdAt: '2026-08-01T09:00:00.000Z', reviewedAt: '2026-08-01T11:00:00.000Z',
});
makeApp({
  id: 'demo-emi-ordered-0004', appNumber: 'LX-EMI-20260725-0004', status: 'ORDER_CONFIRMED',
  product: P.ordered, dpPct: 0.25, loanPct: 0.75, tenure: 6, rate: 11.5, fee: 299,
  adminRemarks: 'Order confirmed after successful down payment.',
  createdAt: '2026-07-25T13:00:00.000Z', reviewedAt: '2026-07-25T15:00:00.000Z',
});
makeApp({
  id: 'demo-emi-active-0003', appNumber: 'LX-EMI-20260720-0003', status: 'ACTIVE_EMI',
  product: P.active, dpPct: 0.2, loanPct: 0.8, tenure: 12, rate: 12.5, fee: 548,
  adminRemarks: 'Loan activated after down payment.',
  createdAt: '2026-07-20T08:00:00.000Z', reviewedAt: '2026-07-20T10:00:00.000Z',
});
makeApp({
  id: 'demo-emi-rejected-0002', appNumber: 'LX-EMI-20260715-0002', status: 'REJECTED',
  product: P.rejected, dpPct: 0.2, loanPct: 0.8, tenure: 12, rate: 12.5,
  rejectionReason: 'Not eligible at this time - income documents insufficient.',
  adminRemarks: 'Application rejected after review.',
  createdAt: '2026-07-15T09:30:00.000Z', reviewedAt: '2026-07-16T11:00:00.000Z',
});
makeApp({
  id: 'demo-emi-declined-0001', appNumber: 'LX-EMI-20260710-0001', status: 'DECLINED_BY_CUSTOMER',
  product: P.declined, dpPct: 0.2, loanPct: 0.8, tenure: 12, rate: 12.5, fee: 449,
  adminRemarks: 'Customer declined the revised offer.',
  offerDeclinedAt: '2026-07-13T09:00:00.000Z',
  createdAt: '2026-07-10T09:30:00.000Z', reviewedAt: '2026-07-11T10:00:00.000Z',
});

// ---------------- Active loan + schedule ----------------
const activeApp = apps.find((a) => a.id === 'demo-emi-active-0003');
const loan = {
  id: 'demo-loan-active-0001',
  loanAccountNumber: 'LN-DEMO-202607200001',
  applicationId: activeApp.id,
  userId: USER_ID,
  productId: activeApp.productId,
  loanAmount: activeApp.approvedAmount,
  interestRate: activeApp.interestRate,
  processingFee: activeApp.processingFee,
  loanTenure: activeApp.approvedTenure,
  emiAmount: activeApp.monthlyEmi,
  loanStatus: 'ACTIVE',
  loanStartDate: '2026-07-20T00:00:00.000Z',
  loanEndDate: '2027-07-20T00:00:00.000Z',
  createdAt: '2026-07-20T10:05:00.000Z',
  updatedAt: '2026-07-20T10:05:00.000Z',
};
const schedule = buildSchedule(loan.loanAmount, loan.interestRate, loan.loanTenure, '2026-07-20T00:00:00.000Z');
loan.totalInterest = schedule.totalInterest;
loan.totalPayable = schedule.totalPayable;
loan.outstandingAmount = round2(schedule.totalPayable - schedule.rows[0].emiAmount);
loan.paidAmount = schedule.rows[0].emiAmount;
loan.nextEmiDueDate = schedule.rows[1].dueDate;

const scheduleRows = schedule.rows.map((r, i) => ({
  id: `demo-sch-active-${String(i + 1).padStart(3, '0')}`,
  loanAccountId: loan.id,
  emiNumber: r.emiNumber,
  dueDate: r.dueDate,
  principalAmount: r.principalAmount,
  interestAmount: r.interestAmount,
  emiAmount: r.emiAmount,
  remainingBalance: r.remainingBalance,
  paymentStatus: i === 0 ? 'PAID' : 'PENDING',
  paidAt: i === 0 ? '2026-08-19T09:00:00.000Z' : null,
  createdAt: loan.createdAt,
  updatedAt: loan.createdAt,
}));

// ---------------- SQL assembly ----------------
const L = [];
L.push(`-- ============================================================`);
L.push(`-- LoanEx Demo EMI data (user: ${USER_ID})`);
L.push(`-- Run this in the Supabase SQL Editor for project vbzulguxiyvpozpjfxpz`);
L.push(`-- It (1) fixes the schema of the EMI-related tables, (2) seeds demo`);
L.push(`-- applications covering every status, (3) seeds a demo loan + schedule.`);
L.push(`-- ============================================================`);
L.push(``);

// 1) Schema fixes ---------------------------------------------------
L.push(`-- ============ 1. SCHEMA FIXES ============`);
L.push(`-- emi_applications was created as (id, data jsonb); give it real columns`);
L.push(`DROP TABLE IF EXISTS public."emi_applications" CASCADE;`);
L.push(`CREATE TABLE public."emi_applications" (`);
L.push(`  "id" text, "applicationNumber" text, "userId" text, "productId" text, "productName" text,`);
L.push(`  "sellingPrice" double precision, "requestedAmount" double precision, "requestedDownPayment" double precision,`);
L.push(`  "requestedTenure" bigint, "estimatedMonthlyEmi" double precision,`);
L.push(`  "approvedAmount" double precision, "approvedTenure" bigint, "approvedDownPayment" double precision,`);
L.push(`  "monthlyEmi" double precision, "interestRate" double precision, "processingFee" double precision,`);
L.push(`  "status" text, "adminRemarks" text, "rejectionReason" text,`);
L.push(`  "submittedAt" text, "reviewedAt" text, "termsModifiedAt" text, "offerAcceptedAt" text, "offerDeclinedAt" text,`);
L.push(`  "createdAt" text, "updatedAt" text`);
L.push(`);`);
L.push(`CREATE INDEX IF NOT EXISTS "emi_applications_id_idx" ON public."emi_applications" ("id");`);
L.push(`CREATE INDEX IF NOT EXISTS "emi_applications_user_status_idx" ON public."emi_applications" ("userId", "status");`);
L.push(`ALTER TABLE public."emi_applications" ENABLE ROW LEVEL SECURITY;`);
L.push(`GRANT ALL ON public."emi_applications" TO anon, authenticated, service_role;`);
L.push(``);

L.push(`-- emi_schedules was (id, data jsonb); give it real columns`);
L.push(`DROP TABLE IF EXISTS public."emi_schedules" CASCADE;`);
L.push(`CREATE TABLE public."emi_schedules" (`);
L.push(`  "id" text, "loanAccountId" text, "emiNumber" bigint, "dueDate" text,`);
L.push(`  "principalAmount" double precision, "interestAmount" double precision, "emiAmount" double precision,`);
L.push(`  "remainingBalance" double precision, "paymentStatus" text, "paidAt" text,`);
L.push(`  "createdAt" text, "updatedAt" text`);
L.push(`);`);
L.push(`CREATE INDEX IF NOT EXISTS "emi_schedules_id_idx" ON public."emi_schedules" ("id");`);
L.push(`CREATE INDEX IF NOT EXISTS "emi_schedules_loan_idx" ON public."emi_schedules" ("loanAccountId");`);
L.push(`ALTER TABLE public."emi_schedules" ENABLE ROW LEVEL SECURITY;`);
L.push(`GRANT ALL ON public."emi_schedules" TO anon, authenticated, service_role;`);
L.push(``);

const alterLoans = [
  'ALTER TABLE public."loanAccount" ADD COLUMN IF NOT EXISTS "paidAmount" double precision;',
  'ALTER TABLE public."loanAccount" ADD COLUMN IF NOT EXISTS "nextEmiDueDate" text;',
  'ALTER TABLE public."loanAccount" ADD COLUMN IF NOT EXISTS "loanStartDate" text;',
  'ALTER TABLE public."loanAccount" ADD COLUMN IF NOT EXISTS "loanEndDate" text;',
  'ALTER TABLE public."loan_accounts" ADD COLUMN IF NOT EXISTS "paidAmount" double precision;',
  'ALTER TABLE public."loan_accounts" ADD COLUMN IF NOT EXISTS "nextEmiDueDate" text;',
  'ALTER TABLE public."loan_accounts" ADD COLUMN IF NOT EXISTS "loanStartDate" text;',
  'ALTER TABLE public."loan_accounts" ADD COLUMN IF NOT EXISTS "loanEndDate" text;',
  'ALTER TABLE public."customerVerification" ADD COLUMN IF NOT EXISTS "cibilScore" bigint;',
  'ALTER TABLE public."paymentTransaction" ADD COLUMN IF NOT EXISTS "razorpayPaymentId" text;',
  'ALTER TABLE public."paymentTransaction" ADD COLUMN IF NOT EXISTS "razorpaySignature" text;',
  'ALTER TABLE public."userAddress" ADD COLUMN IF NOT EXISTS "profileId" text;',
  'ALTER TABLE public."userAddress" ADD COLUMN IF NOT EXISTS "addressType" text;',
  'ALTER TABLE public."userAddress" ADD COLUMN IF NOT EXISTS "addressLine1" text;',
  'ALTER TABLE public."userAddress" ADD COLUMN IF NOT EXISTS "addressLine2" text;',
  'ALTER TABLE public."userAddress" ADD COLUMN IF NOT EXISTS "landmark" text;',
  'ALTER TABLE public."userAddress" ADD COLUMN IF NOT EXISTS "city" text;',
  'ALTER TABLE public."userAddress" ADD COLUMN IF NOT EXISTS "state" text;',
  'ALTER TABLE public."userAddress" ADD COLUMN IF NOT EXISTS "pincode" text;',
  'ALTER TABLE public."userAddress" ADD COLUMN IF NOT EXISTS "country" text;',
  'ALTER TABLE public."orders" ADD COLUMN IF NOT EXISTS "orderNumber" text;',
  'ALTER TABLE public."orders" ADD COLUMN IF NOT EXISTS "applicationId" text;',
  'ALTER TABLE public."orders" ADD COLUMN IF NOT EXISTS "productId" text;',
  'ALTER TABLE public."orders" ADD COLUMN IF NOT EXISTS "quantity" bigint;',
  'ALTER TABLE public."orders" ADD COLUMN IF NOT EXISTS "paymentTransactionId" text;',
  'ALTER TABLE public."orders" ADD COLUMN IF NOT EXISTS "orderStatus" text;',
  'ALTER TABLE public."orders" ADD COLUMN IF NOT EXISTS "estimatedDeliveryDate" text;',
  'ALTER TABLE public."orders" ADD COLUMN IF NOT EXISTS "courierPartner" text;',
  'ALTER TABLE public."orders" ADD COLUMN IF NOT EXISTS "trackingNumber" text;',
  'ALTER TABLE public."orders" ADD COLUMN IF NOT EXISTS "warehouse" text;',
  'ALTER TABLE public."orders" ADD COLUMN IF NOT EXISTS "deliveryAddress" text;',
  'ALTER TABLE public."orderTracking" ADD COLUMN IF NOT EXISTS "remarks" text;',
  'ALTER TABLE public."orderTracking" ADD COLUMN IF NOT EXISTS "updatedBy" text;',
];
L.push(`-- Loan / verification / order tables: add missing columns (idempotent)`);
L.push(...alterLoans);
L.push(``);

// 2) Customer KYC data ------------------------------------------------
L.push(`-- ============ 2. CUSTOMER VERIFICATION (KYC DONE) ============`);
L.push(`-- Synthetic demo customer (owner of the demo applications below)`);
L.push(`INSERT INTO public."users" ("id", "phone", "email", "role", "encryptedPassword", "created_at", "updated_at")`);
L.push(`VALUES (${[USER_ID, DEMO_PHONE, 'demo.customer@loanex.in', 'customer', NULL, NOW, NOW].map(q).join(', ')});`);
L.push(`INSERT INTO public."profiles" ("id", "mobile_number", "fullName", "email", "kyc_status", "createdAt", "updatedAt")`);
L.push(`VALUES (${[USER_ID, DEMO_PHONE, 'Demo Customer', 'demo.customer@loanex.in', 'Approved', NOW, NOW].map(q).join(', ')});`);
L.push(``);
L.push(`INSERT INTO public."customerVerification" ("id", "userId", "mobileVerified", "aadhaarVerified", "panVerified", "bankVerified", "verificationStatus", "cibilScore", "createdAt", "updatedAt")`);
L.push(`VALUES (${['demo-cv-0001', USER_ID, true, true, true, false, 'COMPLETED', 720, NOW, NOW].map(q).join(', ')});`);
L.push(``);
L.push(`INSERT INTO public."aadhaarVerification" ("id", "userId", "aadhaarNumberMasked", "aadhaarHash", "verificationStatus", "verifiedAt", "createdAt", "updatedAt")`);
L.push(`VALUES (${['demo-aadhaar-0001', USER_ID, 'XXXXXXXX0292', 'demo-hash-aadhaar', 'VERIFIED', '2026-07-01T10:00:00.000Z', '2026-07-01T10:00:00.000Z', '2026-07-01T10:00:00.000Z'].map(q).join(', ')});`);
L.push(``);
L.push(`INSERT INTO public."panVerification" ("id", "userId", "panNumberMasked", "panHash", "fullName", "dateOfBirth", "status", "verifiedAt", "createdAt")`);
L.push(`VALUES (${['demo-pan-0001', USER_ID, 'XXXXXXXX123K', 'demo-hash-pan', 'Demo Customer', '1995-01-01', 'VERIFIED', '2026-07-02T11:00:00.000Z', '2026-07-02T11:00:00.000Z'].map(q).join(', ')});`);
L.push(``);
L.push(`INSERT INTO public."mobileVerification" ("id", "userId", "mobile", "isUsed", "isVerified", "purpose", "createdAt", "updatedAt")`);
L.push(`VALUES (${['demo-mobile-0001', USER_ID, DEMO_PHONE, true, true, 'SIGNUP', '2026-06-28T09:00:00.000Z', '2026-06-28T09:00:00.000Z'].map(q).join(', ')});`);
L.push(``);
L.push(`UPDATE public."customer_kyc" SET "pan_verified" = true, "panNumber" = 'ABCDE1234F', "cibil_score" = 720, "updatedAt" = '2026-08-06T10:00:00.000Z' WHERE "userId" = ${q(USER_ID)};`);
L.push(``);

// 3) EMI applications -------------------------------------------------
L.push(`-- ============ 3. DEMO EMI APPLICATIONS (ALL STATUSES) ============`);
const appCols = Object.keys(apps[0]);
for (const app of apps) {
  L.push(`INSERT INTO public."emi_applications" (${appCols.map((c) => `"${c}"`).join(', ')})`);
  L.push(`VALUES (${appCols.map((c) => q(app[c])).join(', ')});`);
}
L.push(``);

// 4) Loan account + schedules ----------------------------------------
L.push(`-- ============ 4. DEMO ACTIVE LOAN + EMI SCHEDULE ============`);
const loanCols = Object.keys(loan);
L.push(`INSERT INTO public."loanAccount" (${loanCols.map((c) => `"${c}"`).join(', ')})`);
L.push(`VALUES (${loanCols.map((c) => q(loan[c])).join(', ')});`);
L.push(``);
const schCols = Object.keys(scheduleRows[0]);
for (const row of scheduleRows) {
  L.push(`INSERT INTO public."emi_schedules" (${schCols.map((c) => `"${c}"`).join(', ')})`);
  L.push(`VALUES (${schCols.map((c) => q(row[c])).join(', ')});`);
}
L.push(``);

// 5) Down payment transaction + order for the earlier scenarios -------
L.push(`-- ============ 5. DOWN PAYMENT TRANSACTION + CONFIRMED ORDER ============`);
const dpDoneApp = apps.find((a) => a.id === 'demo-emi-dpdone-0005');
L.push(`INSERT INTO public."paymentTransaction" ("id", "applicationId", "userId", "razorpayOrderId", "amount", "currency", "paymentStatus", "paymentType", "createdAt", "updatedAt")`);
L.push(`VALUES (${['demo-txn-dp-0001', dpDoneApp.id, USER_ID, 'order_demo_dp_0001', dpDoneApp.approvedDownPayment, 'INR', 'SUCCESS', 'DOWN_PAYMENT', '2026-08-01T11:30:00.000Z', '2026-08-01T11:30:00.000Z'].map(q).join(', ')});`);
L.push(``);
const orderedApp = apps.find((a) => a.id === 'demo-emi-ordered-0004');
L.push(`INSERT INTO public."orders" ("id", "orderNumber", "applicationId", "userId", "productId", "quantity", "paymentTransactionId", "orderStatus", "status", "estimatedDeliveryDate", "courierPartner", "trackingNumber", "warehouse", "deliveryAddress", "createdAt", "updatedAt")`);
L.push(`VALUES (${['demo-order-0004', 'LX-ORD-202607250004', orderedApp.id, USER_ID, orderedApp.productId, 1, 'demo-txn-dp-0001', 'ORDER_CONFIRMED', 'ORDER_CONFIRMED', '2026-08-01T00:00:00.000Z', null, null, null, '1, Demo Street, Demo Apartments, Mumbai, Maharashtra - 400001', '2026-07-25T15:30:00.000Z', '2026-07-25T15:30:00.000Z'].map(q).join(', ')});`);
L.push(``);

// 6) Shipping address for the user -----------------------------------
L.push(`-- ============ 6. DEFAULT SHIPPING ADDRESS ============`);
L.push(`INSERT INTO public."userAddress" ("id", "userId", "addressType", "addressLine1", "addressLine2", "landmark", "city", "state", "pincode", "country", "isDefault", "createdAt", "updatedAt")`);
L.push(`VALUES (${['demo-addr-0001', USER_ID, 'SHIPPING', '1, Demo Street', 'Demo Apartments', 'Near Demo Mall', 'Mumbai', 'Maharashtra', '400001', 'India', true, '2026-06-29T12:00:00.000Z', '2026-06-29T12:00:00.000Z'].map(q).join(', ')});`);
L.push(``);
L.push(`-- ============ DONE ============`);

fs.writeFileSync(OUT, L.join('\n'), 'utf8');
console.log(`Wrote ${OUT} (${fs.statSync(OUT).size} bytes)`);
console.log(`apps: ${apps.length}, schedule rows: ${scheduleRows.length}`);
console.log(`active loan: amount ${loan.loanAmount}, emi ${loan.emiAmount}, interest ${loan.totalInterest}, payable ${loan.totalPayable}`);
