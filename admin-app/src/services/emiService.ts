import api from './api';
import { EmiApplicationStatus } from '../types/emiApplication';
import { FiCaseStatus } from '../types/fiCase';

// ==================== EMI Applications ====================

export interface EmiApplication {
  id: string;
  customerName: string;
  mobile: string;
  selectedProduct: string;
  requestedLoanAmount: number;
  emiPlan: string;
  applicationDate: string;
  status: EmiApplicationStatus;

  // Backend fields if present
  userId?: string;
  orderId?: string;
  productId?: string;
  emiPlanId?: string;
  totalAmount?: number;
  downPayment?: number;
  monthlyEmi?: number;
  tenure?: number;
  createdAt?: string;
  updatedAt?: string;
}

export function mapEmiApplication(raw: any): EmiApplication {
  const rawStatus = String(raw.status || '').toLowerCase();
  let status: EmiApplicationStatus = 'pending';
  if (rawStatus === 'approved' || rawStatus === 'active') status = 'approved';
  else if (rawStatus === 'rejected') status = 'rejected';
  else if (rawStatus === 'under_review' || rawStatus === 'under-review' || rawStatus === 'review') status = 'under_review';
  else if (rawStatus === 'hold' || rawStatus === 'on_hold') status = 'hold';
  else if (rawStatus === 'pending') status = 'pending';

  return {
    id: raw.id || '',
    customerName: raw.customerName || raw.userName || raw.profile?.fullName || (raw.userId ? `User ${raw.userId.slice(-4)}` : 'Customer'),
    mobile: raw.mobile || raw.userMobile || raw.profile?.mobile_number || '+91 98765 43210',
    selectedProduct: raw.selectedProduct || raw.productName || raw.product?.name || raw.productId || 'Product',
    requestedLoanAmount: typeof raw.requestedLoanAmount === 'number' ? raw.requestedLoanAmount : (raw.totalAmount || 0),
    emiPlan: raw.emiPlan || raw.planName || (raw.tenure ? `${raw.tenure} Months Standard` : 'Standard Plan'),
    applicationDate: raw.applicationDate || (raw.createdAt ? raw.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
    status,
    userId: raw.userId,
    orderId: raw.orderId,
    productId: raw.productId,
    emiPlanId: raw.emiPlanId,
    totalAmount: raw.totalAmount,
    downPayment: raw.downPayment,
    monthlyEmi: raw.monthlyEmi,
    tenure: raw.tenure,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

/**
 * Get ALL EMI applications (admin endpoint)
 */
export const getAllEmiApplications = async (): Promise<EmiApplication[]> => {
  const response = await api.get('/admin/emi-applications');
  const data = response.data.data || [];
  const list = Array.isArray(data) ? data : data.items || [];
  return list.map(mapEmiApplication);
};

/**
 * Get single EMI application detail (admin endpoint)
 */
export const getEmiApplicationById = async (applicationId: string): Promise<EmiApplication | null> => {
  try {
    const response = await api.get(`/admin/emi-applications/${applicationId}`);
    if (response.data.data) {
      return mapEmiApplication(response.data.data);
    }
  } catch (error) {
    // Fallback: search in full list
  }
  const all = await getAllEmiApplications();
  return all.find((app) => app.id === applicationId) || null;
};

/**
 * Approve an EMI application (admin endpoint)
 */
export const approveEmiApplication = async (applicationId: string): Promise<any> => {
  const response = await api.post(`/admin/emi-applications/${applicationId}/approve`);
  return response.data.data;
};

// ==================== FI Cases ====================

export interface FiCase {
  id: string;
  customerName: string;
  mobile: string;
  productName: string;
  assignedExecutive: string;
  assignedDate: string;
  status: FiCaseStatus;
  photoCount?: number;
  gpsLocation?: string;
  remarks?: string;
}

export function mapFiCase(raw: any): FiCase {
  const rawStatus = String(raw.status || '').toLowerCase();
  let status: FiCaseStatus = 'pending';
  if (rawStatus === 'completed') status = 'completed';
  else if (rawStatus === 'in_progress' || rawStatus === 'in-progress') status = 'in_progress';
  else if (rawStatus === 'hold' || rawStatus === 'on_hold') status = 'hold';
  else if (rawStatus === 'pending') status = 'pending';

  return {
    id: raw.id || '',
    customerName: raw.customerName || 'Customer',
    mobile: raw.mobile || '+91 98765 43210',
    productName: raw.productName || 'Product',
    assignedExecutive: raw.assignedExecutive || 'Unassigned',
    assignedDate: raw.assignedDate || (raw.createdAt ? raw.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
    status,
    photoCount: raw.photoCount ?? 0,
    gpsLocation: raw.gpsLocation || '',
    remarks: raw.remarks || '',
  };
}

/**
 * Get ALL FI cases (admin endpoint)
 */
export const getAllFiCases = async (): Promise<FiCase[]> => {
  try {
    const response = await api.get('/admin/fi-cases');
    const data = response.data.data || [];
    const list = Array.isArray(data) ? data : data.items || [];
    return list.map(mapFiCase);
  } catch (error) {
    return [];
  }
};

/**
 * Get single FI case detail (admin endpoint)
 */
export const getFiCaseById = async (fiCaseId: string): Promise<FiCase | null> => {
  try {
    const response = await api.get(`/admin/fi-cases/${fiCaseId}`);
    if (response.data.data) {
      return mapFiCase(response.data.data);
    }
  } catch (error) {
    // Fallback: search in full list
  }
  const all = await getAllFiCases();
  return all.find((item) => item.id === fiCaseId) || null;
};

/**
 * Update FI case (admin endpoint)
 */
export const updateFiCase = async (fiCaseId: string, data: Partial<FiCase>): Promise<FiCase> => {
  const response = await api.patch(`/admin/fi-cases/${fiCaseId}`, data);
  return mapFiCase(response.data.data);
};

// ==================== Loans ====================

export interface Loan {
  id: string;
  userId: string;
  orderId: string;
  productId: string;
  emiPlanId: string;
  status: string;
  totalAmount: number;
  downPayment: number;
  monthlyEmi: number;
  tenure: number;
  remainingEmi: number;
  nextDueDate: string;
  createdAt: string;
}

/**
 * Get ALL loans (admin endpoint)
 */
export const getAllLoans = async (): Promise<Loan[]> => {
  const response = await api.get('/admin/loans');
  const data = response.data.data || [];
  return Array.isArray(data) ? data : data.items || [];
};

/**
 * Get a single loan detail (admin endpoint)
 */
export const getLoanById = async (loanId: string): Promise<Loan> => {
  const response = await api.get(`/admin/loans/${loanId}`);
  return response.data.data;
};

/**
 * Update loan details (admin endpoint)
 */
export const updateLoan = async (loanId: string, data: Partial<Loan>): Promise<Loan> => {
  const response = await api.patch(`/admin/loans/${loanId}`, data);
  return response.data.data;
};

/**
 * Get EMI schedule for a loan
 */
export const getLoanEmiSchedule = async (loanId: string): Promise<any[]> => {
  const response = await api.get(`/loans/${loanId}/emi-schedule`);
  const data = response.data.data;
  return Array.isArray(data) ? data : data?.items || [];
};

// ==================== EMI Payments ====================

export interface EmiPayment {
  id: string;
  userId: string;
  loanId: string;
  amount: number;
  status: string;
  createdAt: string;
}

/**
 * Get ALL EMI payments (admin endpoint)
 */
export const getAllEmiPayments = async (): Promise<EmiPayment[]> => {
  const response = await api.get('/admin/emi-payments');
  const data = response.data.data || [];
  return Array.isArray(data) ? data : data.items || [];
};

// ==================== Autopay ====================

export interface Autopay {
  id: string;
  userId: string;
  loanId: string;
  status: string;
  createdAt: string;
}

/**
 * Get ALL autopay mandates (admin endpoint)
 */
export const getAllAutopay = async (): Promise<Autopay[]> => {
  const response = await api.get('/admin/autopay');
  const data = response.data.data || [];
  return Array.isArray(data) ? data : data.items || [];
};

/**
 * Get autopay for a specific loan (admin endpoint)
 */
export const getAutopayByLoanId = async (loanId: string): Promise<Autopay> => {
  const response = await api.get(`/admin/autopay/${loanId}`);
  return response.data.data;
};

/**
 * Update autopay settings (admin endpoint)
 */
export const updateAutopay = async (loanId: string, data: Partial<Autopay>): Promise<Autopay> => {
  const response = await api.patch(`/admin/autopay/${loanId}`, data);
  return response.data.data;
};
