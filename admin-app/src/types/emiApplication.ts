export type EmiApplicationStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'hold';

export interface EmiApplication {
  id: string;
  customerName: string;
  mobile: string;
  selectedProduct: string;
  requestedLoanAmount: number;
  emiPlan: string;
  applicationDate: string;
  status: EmiApplicationStatus;
}
