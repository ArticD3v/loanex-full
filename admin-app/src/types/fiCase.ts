export type FiCaseStatus = 'pending' | 'in_progress' | 'completed' | 'hold';

export interface FiCase {
  id: string;
  customerName: string;
  mobile: string;
  productName: string;
  assignedExecutive: string;
  assignedDate: string;
  status: FiCaseStatus;
  /** Optional evidence fields — prepared for future FI submit flow */
  photoCount?: number;
  gpsLocation?: string;
  remarks?: string;
}
