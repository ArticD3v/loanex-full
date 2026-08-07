import {
  DisbursementDetails,
  DownPaymentDetails,
  EkycDetails,
  ESignDetails,
  MandateDetails,
} from '../../types/emiLifecycle';

export const MOCK_DOWN_PAYMENTS: DownPaymentDetails[] = [
  {
    applicationId: 'EMI-APP-10001',
    status: 'Paid',
    amount: '₹24,999',
    mode: 'UPI',
    reference: 'DP-TXN-88421',
    paidOn: '2026-07-29',
    collectedBy: 'Branch Counter',
    remarks: 'Down payment received successfully.',
    completedBy: 'Branch Counter',
    completedAt: '2026-07-29T11:20:00',
  },
  {
    applicationId: 'EMI-APP-10008',
    status: 'Paid',
    amount: '₹5,398',
    mode: 'Cash',
    reference: 'DP-TXN-88455',
    paidOn: '2026-07-27',
    collectedBy: 'Sales Executive',
    remarks: 'Cash receipt generated.',
    completedBy: 'Sales Executive',
    completedAt: '2026-07-27T10:45:00',
  },
];

/** EMI-APP-10001 = fully completed lifecycle. EMI-APP-10008 = credit-approved, ready for Super Admin to run eKYC → Dispatch. */
export const MOCK_ESIGNS: ESignDetails[] = [
  {
    applicationId: 'EMI-APP-10001',
    status: 'Signed',
    documentType: 'EMI Agreement',
    signedBy: 'Rajesh Kumar',
    signedOn: '2026-07-29',
    provider: 'eSign Gateway (Mock)',
    remarks: 'Customer eSign completed.',
    completedBy: 'Rajesh Kumar',
    completedAt: '2026-07-29T14:10:00',
  },
];

export const MOCK_EKYC: EkycDetails[] = [
  {
    applicationId: 'EMI-APP-10001',
    status: 'Completed',
    method: 'Aadhaar OTP',
    aadhaarMasked: 'XXXX-XXXX-3210',
    verifiedOn: '2026-07-29',
    verifiedBy: 'System',
    remarks: 'eKYC matched with application KYC.',
    completedBy: 'System (Mock)',
    completedAt: '2026-07-29T12:05:00',
  },
];

export const MOCK_MANDATES: MandateDetails[] = [
  {
    applicationId: 'EMI-APP-10001',
    status: 'Active',
    mandateType: 'eNACH',
    bankAccount: 'HDFC ****4521',
    umrn: 'UMRN-MOCK-10001',
    registeredOn: '2026-07-30',
    remarks: 'Mandate registered for EMI auto-debit.',
    completedBy: 'System (Mock)',
    completedAt: '2026-07-30T09:40:00',
  },
];

export const MOCK_DISBURSEMENTS: DisbursementDetails[] = [
  {
    applicationId: 'EMI-APP-10001',
    status: 'Completed',
    amount: '₹99,999',
    disbursedTo: 'Dealer Settlement Wallet',
    transactionId: 'DISB-8842101',
    disbursedOn: '2026-07-30',
    remarks: 'Loan amount disbursed after mandate activation.',
    completedBy: 'Finance Team (Mock)',
    completedAt: '2026-07-30T11:00:00',
  },
];

export function findDownPayment(applicationId: string): DownPaymentDetails {
  return (
    MOCK_DOWN_PAYMENTS.find((item) => item.applicationId === applicationId) ?? {
      applicationId,
      status: 'Pending',
      amount: '—',
      mode: '—',
      reference: '—',
      paidOn: '—',
      collectedBy: '—',
      remarks: 'Down payment details will appear after credit approval (placeholder).',
      completedBy: '—',
      completedAt: '—',
    }
  );
}

export function findESign(applicationId: string): ESignDetails {
  return (
    MOCK_ESIGNS.find((item) => item.applicationId === applicationId) ?? {
      applicationId,
      status: 'Pending',
      documentType: 'EMI Agreement',
      signedBy: '—',
      signedOn: '—',
      provider: 'eSign Gateway (Mock)',
      remarks: 'eSign placeholder — no backend configured.',
      completedBy: '—',
      completedAt: '—',
    }
  );
}

export function findEkyc(applicationId: string): EkycDetails {
  return (
    MOCK_EKYC.find((item) => item.applicationId === applicationId) ?? {
      applicationId,
      status: 'Pending',
      method: 'Aadhaar OTP',
      aadhaarMasked: '—',
      verifiedOn: '—',
      verifiedBy: '—',
      remarks: 'eKYC placeholder — no backend configured.',
      completedBy: '—',
      completedAt: '—',
    }
  );
}

export function findMandate(applicationId: string): MandateDetails {
  return (
    MOCK_MANDATES.find((item) => item.applicationId === applicationId) ?? {
      applicationId,
      status: 'Pending',
      mandateType: 'eNACH',
      bankAccount: '—',
      umrn: '—',
      registeredOn: '—',
      remarks: 'Mandate placeholder — no backend configured.',
      completedBy: '—',
      completedAt: '—',
    }
  );
}

export function findDisbursement(applicationId: string): DisbursementDetails {
  return (
    MOCK_DISBURSEMENTS.find((item) => item.applicationId === applicationId) ?? {
      applicationId,
      status: 'Pending',
      amount: '—',
      disbursedTo: '—',
      transactionId: '—',
      disbursedOn: '—',
      remarks: 'Disbursement placeholder — no backend configured.',
      completedBy: '—',
      completedAt: '—',
    }
  );
}
