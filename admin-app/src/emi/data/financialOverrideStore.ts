import {
  ApplyFinancialOverrideInput,
  FinancialOverrideRecord,
  FinancialValues,
  ProductFinancialDefaults,
} from '../../types/financialOverride';

/**
 * Product default financial configuration (mock).
 * Down Payment amounts are in ₹ — same format as Product EMI plan Down Payment.
 * Credit Review overrides NEVER mutate this map.
 */
export const PRODUCT_FINANCIAL_DEFAULTS: Record<string, ProductFinancialDefaults> = {
  'Samsung Galaxy S24 Ultra 256GB': {
    downPaymentAmount: 25000,
    interestRatePercent: 14,
    emiTenureMonths: 12,
    processingFee: 999,
    serviceCharges: 499,
    otherCharges: 0,
    emiPlan: '12 Months Standard',
  },
  'Apple MacBook Pro 14" M3 Pro': {
    downPaymentAmount: 40000,
    interestRatePercent: 13.5,
    emiTenureMonths: 18,
    processingFee: 1499,
    serviceCharges: 699,
    otherCharges: 200,
    emiPlan: '18 Months Premium',
  },
  'Sony WH-1000XM5 Wireless Headphones': {
    downPaymentAmount: 5400,
    interestRatePercent: 15,
    emiTenureMonths: 6,
    processingFee: 299,
    serviceCharges: 199,
    otherCharges: 0,
    emiPlan: '6 Months Standard',
  },
  'LG 55" OLED C3 Smart TV': {
    downPaymentAmount: 18000,
    interestRatePercent: 14.5,
    emiTenureMonths: 9,
    processingFee: 799,
    serviceCharges: 399,
    otherCharges: 100,
    emiPlan: '9 Months Standard',
  },
  'OnePlus 12 256GB Flowy Emerald': {
    downPaymentAmount: 13000,
    interestRatePercent: 14,
    emiTenureMonths: 12,
    processingFee: 599,
    serviceCharges: 299,
    otherCharges: 0,
    emiPlan: '12 Months Standard',
  },
  'Dell XPS 15 9530 Laptop': {
    downPaymentAmount: 37500,
    interestRatePercent: 13,
    emiTenureMonths: 12,
    processingFee: 1299,
    serviceCharges: 599,
    otherCharges: 150,
    emiPlan: '12 Months Standard',
  },
  'Samsung Galaxy A55 128GB': {
    downPaymentAmount: 7500,
    interestRatePercent: 14,
    emiTenureMonths: 9,
    processingFee: 499,
    serviceCharges: 249,
    otherCharges: 0,
    emiPlan: '9 Months Standard',
  },
};

const FALLBACK_DEFAULTS: ProductFinancialDefaults = {
  downPaymentAmount: 10000,
  interestRatePercent: 14,
  emiTenureMonths: 12,
  processingFee: 999,
  serviceCharges: 499,
  otherCharges: 0,
  emiPlan: '12 Months Standard',
};

/** EMI plan options for customer-specific override (does not modify Product/EMI Plan master). */
export const FINANCIAL_EMI_PLAN_OPTIONS = [
  '6 Months Standard',
  '9 Months Standard',
  '12 Months Standard',
  '18 Months Premium',
  '24 Months Premium',
];

const records = new Map<string, FinancialOverrideRecord>();
const listeners = new Set<() => void>();
let version = 0;

function notify() {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function getFinancialOverrideVersion(): number {
  return version;
}

export function subscribeFinancialOverrides(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getProductFinancialDefaults(productName: string): FinancialValues {
  const defaults = PRODUCT_FINANCIAL_DEFAULTS[productName] ?? FALLBACK_DEFAULTS;
  return { ...defaults };
}

function valuesEqual(a: FinancialValues, b: FinancialValues): boolean {
  return (
    a.downPaymentAmount === b.downPaymentAmount &&
    a.interestRatePercent === b.interestRatePercent &&
    a.emiTenureMonths === b.emiTenureMonths &&
    a.processingFee === b.processingFee &&
    a.serviceCharges === b.serviceCharges &&
    a.otherCharges === b.otherCharges &&
    a.emiPlan === b.emiPlan
  );
}

function buildDefaultRecord(
  applicationId: string,
  productName: string,
  applicationEmiPlan?: string,
): FinancialOverrideRecord {
  const defaults = getProductFinancialDefaults(productName);
  if (applicationEmiPlan?.trim()) {
    defaults.emiPlan = applicationEmiPlan.trim();
  }
  return {
    applicationId,
    defaults: { ...defaults },
    approved: { ...defaults },
    overrideStatus: 'Not Overridden',
    overrideReason: '—',
    approvedBy: '—',
    overrideDateTime: '',
  };
}

function seedIfNeeded() {
  if (records.size > 0) return;

  const seeded: FinancialOverrideRecord[] = [
    {
      applicationId: 'EMI-APP-10001',
      defaults: getProductFinancialDefaults('Samsung Galaxy S24 Ultra 256GB'),
      approved: getProductFinancialDefaults('Samsung Galaxy S24 Ultra 256GB'),
      overrideStatus: 'Not Overridden',
      overrideReason: '—',
      approvedBy: '—',
      overrideDateTime: '',
    },
    {
      applicationId: 'EMI-APP-10003',
      defaults: getProductFinancialDefaults('Sony WH-1000XM5 Wireless Headphones'),
      approved: {
        ...getProductFinancialDefaults('Sony WH-1000XM5 Wireless Headphones'),
        downPaymentAmount: 6750,
        interestRatePercent: 16,
        processingFee: 399,
      },
      overrideStatus: 'Overridden',
      overrideReason: 'Higher risk profile — adjusted DP, rate and processing fee for eligibility',
      approvedBy: 'Neha Kapoor',
      overrideDateTime: '2026-07-26T15:40:00',
    },
    {
      applicationId: 'EMI-APP-10004',
      defaults: getProductFinancialDefaults('LG 55" OLED C3 Smart TV'),
      approved: {
        ...getProductFinancialDefaults('LG 55" OLED C3 Smart TV'),
        downPaymentAmount: 27000,
        otherCharges: 250,
        emiPlan: '12 Months Standard',
        emiTenureMonths: 12,
      },
      overrideStatus: 'Overridden',
      overrideReason: 'Policy deviation — address mismatch; higher DP and tenure pending clarification',
      approvedBy: 'Neha Kapoor',
      overrideDateTime: '2026-07-31T11:20:00',
    },
    {
      applicationId: 'EMI-APP-10008',
      defaults: getProductFinancialDefaults('Sony WH-1000XM5 Wireless Headphones'),
      approved: getProductFinancialDefaults('Sony WH-1000XM5 Wireless Headphones'),
      overrideStatus: 'Not Overridden',
      overrideReason: '—',
      approvedBy: '—',
      overrideDateTime: '',
    },
  ];

  seeded.forEach((item) => records.set(item.applicationId, cloneRecord(item)));
}

function cloneRecord(record: FinancialOverrideRecord): FinancialOverrideRecord {
  return {
    ...record,
    defaults: { ...record.defaults },
    approved: { ...record.approved },
  };
}

seedIfNeeded();

export function getFinancialOverride(
  applicationId: string,
  productName: string,
  applicationEmiPlan?: string,
): FinancialOverrideRecord {
  const existing = records.get(applicationId);
  if (existing) return cloneRecord(existing);

  const created = buildDefaultRecord(applicationId, productName, applicationEmiPlan);
  records.set(applicationId, created);
  return cloneRecord(created);
}

export function applyFinancialOverride(
  applicationId: string,
  productName: string,
  input: ApplyFinancialOverrideInput,
  applicationEmiPlan?: string,
): FinancialOverrideRecord {
  const current = getFinancialOverride(applicationId, productName, applicationEmiPlan);
  const unchanged = valuesEqual(current.defaults, input.approved);

  const updated: FinancialOverrideRecord = {
    applicationId,
    defaults: { ...current.defaults },
    approved: { ...input.approved },
    overrideStatus: unchanged ? 'Not Overridden' : 'Overridden',
    overrideReason: unchanged ? '—' : input.overrideReason.trim() || '—',
    approvedBy: unchanged ? '—' : input.approvedBy.trim() || 'Authorized User',
    overrideDateTime: unchanged ? '' : new Date().toISOString(),
  };

  records.set(applicationId, updated);
  notify();
  return cloneRecord(updated);
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${value}%`;
}

export function formatCurrencyAmount(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `₹${value.toLocaleString('en-IN')}`;
}

export function formatTenureMonths(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  return `${value} Month${value === 1 ? '' : 's'}`;
}

export function formatOverrideDateTime(value: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Down Payment display — always ₹ amount (never percentage). */
export function formatDownPaymentAmount(value: number): string {
  return formatCurrencyAmount(value);
}

/** @deprecated Use formatDownPaymentAmount — kept for older import paths. */
export function formatDownPaymentPercent(value: number): string {
  return formatCurrencyAmount(value);
}
