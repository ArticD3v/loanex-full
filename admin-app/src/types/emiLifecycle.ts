/** eKYC stage statuses */
export type EkycStatus = 'Pending' | 'In Progress' | 'Completed' | 'Failed';

/** eSign stage statuses */
export type ESignStatus = 'Pending' | 'Agreement Generated' | 'Signed' | 'Failed';

/** eMandate stage statuses */
export type EMandateStatus = 'Pending' | 'Active' | 'Failed';

/** Disbursement stage statuses */
export type DisbursementStatus = 'Pending' | 'Processing' | 'Completed';

export interface DownPaymentDetails {
  applicationId: string;
  status: string;
  amount: string;
  mode: string;
  reference: string;
  paidOn: string;
  collectedBy: string;
  remarks: string;
  completedBy?: string;
  completedAt?: string;
}

export interface ESignDetails {
  applicationId: string;
  status: ESignStatus;
  documentType: string;
  signedBy: string;
  signedOn: string;
  provider: string;
  remarks: string;
  completedBy: string;
  completedAt: string;
}

export interface EkycDetails {
  applicationId: string;
  status: EkycStatus;
  method: string;
  aadhaarMasked: string;
  verifiedOn: string;
  verifiedBy: string;
  remarks: string;
  completedBy: string;
  completedAt: string;
}

export interface MandateDetails {
  applicationId: string;
  status: EMandateStatus;
  mandateType: string;
  bankAccount: string;
  umrn: string;
  registeredOn: string;
  remarks: string;
  completedBy: string;
  completedAt: string;
}

export interface DisbursementDetails {
  applicationId: string;
  status: DisbursementStatus;
  amount: string;
  disbursedTo: string;
  transactionId: string;
  disbursedOn: string;
  remarks: string;
  completedBy: string;
  completedAt: string;
}
