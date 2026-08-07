import { EmiOrderDetails } from '../../types/emiOrder';
import { DispatchDetails } from '../../types/dispatch';
import {
  DisbursementDetails,
  EkycDetails,
  ESignDetails,
  MandateDetails,
} from '../../types/emiLifecycle';
import {
  findDisbursement,
  findEkyc,
  findESign,
  findMandate,
  MOCK_DISBURSEMENTS,
  MOCK_EKYC,
  MOCK_ESIGNS,
  MOCK_MANDATES,
} from './emiLifecycleMockData';
import { findEmiOrder, MOCK_EMI_ORDERS } from './emiOrderMockData';
import { findDispatch, MOCK_DISPATCHES } from './dispatchMockData';

/**
 * Mock EMI lifecycle workflow store.
 *
 * Super Admin can perform Start / Generate actions until Customer App,
 * Credit Portal, and Finance portals own those steps. Switch
 * `LIFECYCLE_ACTION_MODE` to `'view_only'` later — UI cards stay the same;
 * only button enablement changes.
 */
export type LifecycleActionMode = 'perform' | 'view_only';

/** Future migration: set to `'view_only'` so Super Admin only tracks stages. */
export const LIFECYCLE_ACTION_MODE: LifecycleActionMode = 'perform';

export function canPerformLifecycleActions(): boolean {
  return LIFECYCLE_ACTION_MODE === 'perform';
}

type Listener = () => void;

let version = 0;
const listeners = new Set<Listener>();

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function subscribeLifecycleWorkflow(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLifecycleWorkflowVersion(): number {
  return version;
}

function nowIso(): string {
  return new Date().toISOString();
}

function formatDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function upsertByApplicationId<T extends { applicationId: string }>(
  list: T[],
  record: T,
): void {
  const index = list.findIndex((item) => item.applicationId === record.applicationId);
  if (index >= 0) {
    list[index] = record;
  } else {
    list.push(record);
  }
}

import { EmiApplication } from '../../types/emiApplication';

function getApplication(applicationId: string): EmiApplication | undefined {
  return undefined;
}

// ─── Readers (always return a record) ───────────────────────────────────────

export function getEkycDetails(applicationId: string): EkycDetails {
  return findEkyc(applicationId);
}

export function getESignDetails(applicationId: string): ESignDetails {
  return findESign(applicationId);
}

export function getMandateDetails(applicationId: string): MandateDetails {
  return findMandate(applicationId);
}

export function getDisbursementDetails(applicationId: string): DisbursementDetails {
  return findDisbursement(applicationId);
}

export function getOrderDetails(applicationId: string): EmiOrderDetails | undefined {
  return findEmiOrder(applicationId);
}

export function getDispatchDetails(applicationId: string): DispatchDetails | undefined {
  return findDispatch(applicationId);
}

// ─── Stage completion helpers ───────────────────────────────────────────────

export function isEkycCompleted(applicationId: string): boolean {
  return getEkycDetails(applicationId).status === 'Completed';
}

export function isESignCompleted(applicationId: string): boolean {
  return getESignDetails(applicationId).status === 'Signed';
}

export function isEMandateCompleted(applicationId: string): boolean {
  return getMandateDetails(applicationId).status === 'Active';
}

export function isDisbursementCompleted(applicationId: string): boolean {
  return getDisbursementDetails(applicationId).status === 'Completed';
}

export function isOrderCreated(applicationId: string): boolean {
  return Boolean(getOrderDetails(applicationId));
}

export function isDispatchCreated(applicationId: string): boolean {
  return Boolean(getDispatchDetails(applicationId));
}

// ─── eKYC actions ───────────────────────────────────────────────────────────

/** Pending → Completed (mock completes eKYC in one Super Admin action). */
export function startEkyc(applicationId: string): EkycDetails {
  const existing = getEkycDetails(applicationId);
  const completedAt = nowIso();
  const next: EkycDetails = {
    ...existing,
    status: 'Completed',
    method: existing.method || 'Aadhaar OTP',
    aadhaarMasked: existing.aadhaarMasked !== '—' ? existing.aadhaarMasked : 'XXXX-XXXX-0000',
    verifiedOn: formatDateOnly(completedAt),
    verifiedBy: 'Super Admin (Mock)',
    completedBy: 'Super Admin (Mock)',
    completedAt,
    remarks: 'eKYC completed via Super Admin mock workflow.',
  };
  upsertByApplicationId(MOCK_EKYC, next);
  emit();
  return next;
}

// ─── eSign actions ──────────────────────────────────────────────────────────

export function generateAgreement(applicationId: string): ESignDetails {
  const existing = getESignDetails(applicationId);
  const application = getApplication(applicationId);
  const next: ESignDetails = {
    ...existing,
    status: 'Agreement Generated',
    documentType: 'EMI Agreement',
    signedBy: '—',
    signedOn: '—',
    provider: 'eSign Gateway (Mock)',
    completedBy: '—',
    completedAt: '—',
    remarks: `Agreement generated for ${application?.customerName ?? applicationId}. Awaiting eSign.`,
  };
  upsertByApplicationId(MOCK_ESIGNS, next);
  emit();
  return next;
}

export function startESign(applicationId: string): ESignDetails {
  const existing = getESignDetails(applicationId);
  const application = getApplication(applicationId);
  const completedAt = nowIso();
  const next: ESignDetails = {
    ...existing,
    status: 'Signed',
    signedBy: application?.customerName ?? 'Customer',
    signedOn: formatDateOnly(completedAt),
    completedBy: application?.customerName ?? 'Customer',
    completedAt,
    remarks: 'Agreement signed via Super Admin mock eSign.',
  };
  upsertByApplicationId(MOCK_ESIGNS, next);
  emit();
  return next;
}

// ─── eMandate actions ───────────────────────────────────────────────────────

export function startEMandate(applicationId: string): MandateDetails {
  const existing = getMandateDetails(applicationId);
  const completedAt = nowIso();
  const suffix = applicationId.replace(/\D/g, '').slice(-5) || '00000';
  const next: MandateDetails = {
    ...existing,
    status: 'Active',
    mandateType: existing.mandateType || 'eNACH',
    bankAccount: existing.bankAccount !== '—' ? existing.bankAccount : 'HDFC ****0000',
    umrn: existing.umrn !== '—' ? existing.umrn : `UMRN-MOCK-${suffix}`,
    registeredOn: formatDateOnly(completedAt),
    completedBy: 'Super Admin (Mock)',
    completedAt,
    remarks: 'eMandate activated via Super Admin mock workflow.',
  };
  upsertByApplicationId(MOCK_MANDATES, next);
  emit();
  return next;
}

// ─── Disbursement actions ───────────────────────────────────────────────────

export function startDisbursement(applicationId: string): DisbursementDetails {
  const existing = getDisbursementDetails(applicationId);
  const application = getApplication(applicationId);
  const completedAt = nowIso();
  const amount =
    existing.amount !== '—'
      ? existing.amount
      : application
        ? `₹${Math.max(application.requestedLoanAmount - 25000, 0).toLocaleString('en-IN')}`
        : '—';
  const next: DisbursementDetails = {
    ...existing,
    status: 'Completed',
    amount,
    disbursedTo: 'Dealer Settlement Wallet',
    transactionId: `DISB-${Date.now().toString().slice(-7)}`,
    disbursedOn: formatDateOnly(completedAt),
    completedBy: 'Finance Team (Mock)',
    completedAt,
    remarks: 'Disbursement completed via Super Admin mock workflow.',
  };
  upsertByApplicationId(MOCK_DISBURSEMENTS, next);
  emit();
  return next;
}

// ─── Order / Dispatch (unlock after disbursement) ───────────────────────────

export function createOrder(applicationId: string): EmiOrderDetails | undefined {
  const existing = findEmiOrder(applicationId);
  if (existing) return existing;

  const application = getApplication(applicationId);
  if (!application) return undefined;

  const suffix = applicationId.replace(/\D/g, '').slice(-5) || '00000';
  const order: EmiOrderDetails = {
    applicationId,
    orderId: `ORD-${suffix}`,
    customerId: `CUS-${suffix}`,
    customerName: application.customerName,
    productId: '1',
    productName: application.selectedProduct,
    amount: application.requestedLoanAmount,
    paymentType: 'EMI',
    status: 'Created',
    orderDate: formatDateOnly(nowIso()),
  };
  MOCK_EMI_ORDERS.push(order);
  emit();
  return order;
}

export function startDispatch(applicationId: string): DispatchDetails | undefined {
  const existing = findDispatch(applicationId);
  if (existing) return existing;

  if (!findEmiOrder(applicationId)) return undefined;

  const completedAt = nowIso();
  const suffix = applicationId.replace(/\D/g, '').slice(-5) || '00000';
  const dispatch: DispatchDetails = {
    applicationId,
    dispatchStatus: 'Packed',
    courierName: 'BlueDart',
    trackingNumber: `BD${suffix}${Date.now().toString().slice(-4)}`,
    dispatchDate: formatDateOnly(completedAt),
    expectedDelivery: formatDateOnly(
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    ),
  };
  MOCK_DISPATCHES.push(dispatch);
  emit();
  return dispatch;
}
