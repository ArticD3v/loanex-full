import api from './api';
import { Customer, EmiStatus, CustomerStatus } from '../types/customer';

export interface UserProfile {
  id: string;
  phone: string;
  email?: string;
  role: 'customer' | 'admin';
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    mobile_number: string;
    fullName: string;
    email: string;
    dob: string;
    gender: string;
    kyc_status: 'Pending' | 'Approved' | 'Rejected';
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface KycRecord {
  id: string;
  userId: string;
  aadharVerified: boolean;
  aadhar_number: string;
  fullName: string;
  dob: string;
  gender: string;
  address: {
    country: string;
    dist: string;
    state: string;
  };
  pan_verified: boolean;
  panNumber: string;
  cibil_score: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get ALL users with profiles (admin endpoint)
 */
export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const response = await api.get('/admin/users');
    return response.data.data || [];
  } catch (error: any) {
    if (error.status === 404 || error.response?.status === 404) {
      console.warn('[Customers] /admin/users endpoint not found. Backend may need the endpoint added.');
      return [];
    }
    throw error;
  }
};

/**
 * Get ALL KYC records (admin endpoint)
 */
export const getAllKyc = async (): Promise<KycRecord[]> => {
  try {
    const response = await api.get('/admin/kyc');
    return response.data.data || [];
  } catch (error: any) {
    if (error.status === 404 || error.response?.status === 404) {
      console.warn('[Customers] /admin/kyc endpoint not found. Backend may need the endpoint added.');
      return [];
    }
    throw error;
  }
};

/**
 * Get a single user's profile via the profile endpoint
 */
export const getUserProfile = async (): Promise<any> => {
  const response = await api.get('/profile');
  return response.data.data;
};

/**
 * Get verification/KYC status for a user
 */
export const getVerificationStatus = async (): Promise<any> => {
  const response = await api.get('/verification/status');
  return response.data.data;
};

/**
 * Get mapped customers from real backend APIs (/admin/users & /admin/kyc)
 */
export const getCustomers = async (): Promise<Customer[]> => {
  try {
    const users = await getAllUsers();
    const kycRecords = await getAllKyc().catch(() => []);

    return users.map((user) => {
      const kyc = kycRecords.find((k) => k.userId === user.id);
      
      const name =
        user.profile?.fullName ||
        kyc?.fullName ||
        (user.email ? user.email.split('@')[0] : `Customer ${user.id.slice(0, 6)}`);

      const mobile = user.profile?.mobile_number || user.phone || '';
      const city = kyc?.address?.dist || kyc?.address?.state || 'Mumbai';
      const kycStatus = user.profile?.kyc_status;

      let emiStatus: EmiStatus = 'running';
      if (kycStatus === 'Pending') {
        emiStatus = 'pending';
      } else if (kycStatus === 'Rejected') {
        emiStatus = 'rejected';
      } else if (kycStatus === 'Approved') {
        emiStatus = 'running';
      }

      let status: CustomerStatus = 'active';
      if (kycStatus === 'Rejected') {
        status = 'inactive';
      }

      return {
        id: user.id,
        name,
        mobile,
        city,
        emiStatus,
        status,
      };
    });
  } catch (error) {
    console.error('[customerService] Error fetching customers:', error);
    return [];
  }
};

/**
 * Get single customer details by ID
 */
export const getCustomerById = async (id: string): Promise<Customer | undefined> => {
  const customers = await getCustomers();
  return customers.find((c) => c.id === id);
};

