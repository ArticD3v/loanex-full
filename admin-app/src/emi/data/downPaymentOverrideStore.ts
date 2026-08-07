/**
 * Compatibility shim — Credit Review now uses financialOverrideStore with ₹ amounts.
 */
export {
  formatDownPaymentAmount,
  formatDownPaymentPercent,
  formatOverrideDateTime,
  formatCurrencyAmount,
  getFinancialOverrideVersion as getDownPaymentOverrideVersion,
  subscribeFinancialOverrides as subscribeDownPaymentOverrides,
  getProductFinancialDefaults,
} from './financialOverrideStore';

import {
  applyFinancialOverride,
  getFinancialOverride,
  getProductFinancialDefaults,
} from './financialOverrideStore';
import {
  ApplyDownPaymentOverrideInput,
  DownPaymentOverrideRecord,
} from '../../types/downPaymentOverride';

export function getProductDefaultDownPaymentAmount(productName: string): number {
  return getProductFinancialDefaults(productName).downPaymentAmount;
}

/** @deprecated Use getProductDefaultDownPaymentAmount */
export function getProductDefaultDownPaymentPercent(productName: string): number {
  return getProductDefaultDownPaymentAmount(productName);
}

export function getDownPaymentOverride(
  applicationId: string,
  productName: string,
): DownPaymentOverrideRecord {
  const record = getFinancialOverride(applicationId, productName);
  return {
    applicationId: record.applicationId,
    defaultDownPaymentAmount: record.defaults.downPaymentAmount,
    approvedDownPaymentAmount: record.approved.downPaymentAmount,
    overrideStatus: record.overrideStatus,
    overrideReason: record.overrideReason,
    approvedBy: record.approvedBy,
    overrideDateTime: record.overrideDateTime,
  };
}

export function applyDownPaymentOverride(
  applicationId: string,
  productName: string,
  input: ApplyDownPaymentOverrideInput,
): DownPaymentOverrideRecord {
  const current = getFinancialOverride(applicationId, productName);
  const updated = applyFinancialOverride(applicationId, productName, {
    approved: {
      ...current.approved,
      downPaymentAmount: input.updatedDownPaymentAmount,
    },
    overrideReason: input.overrideReason,
    approvedBy: input.approvedBy,
  });
  return {
    applicationId: updated.applicationId,
    defaultDownPaymentAmount: updated.defaults.downPaymentAmount,
    approvedDownPaymentAmount: updated.approved.downPaymentAmount,
    overrideStatus: updated.overrideStatus,
    overrideReason: updated.overrideReason,
    approvedBy: updated.approvedBy,
    overrideDateTime: updated.overrideDateTime,
  };
}
