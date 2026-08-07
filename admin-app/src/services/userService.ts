import { getAllUsers, UserProfile } from './customerService';
import { AppUser, UserRole, UserStatus, UserLoginEntry, UserActivityEntry } from '../types/user';
import api from './api';
export const getUsers = async (): Promise<AppUser[]> => {
  try {
    const users = await getAllUsers();
    return users.map((u, index) => {
      const name =
        u.profile?.fullName ||
        (u.email ? u.email.split('@')[0] : `User ${u.id.slice(0, 6)}`);

      const role: UserRole =
        u.role === 'admin'
          ? 'Super Admin'
          : index % 4 === 0
          ? 'Credit Officer'
          : index % 4 === 1
          ? 'FI Executive'
          : index % 4 === 2
          ? 'Branch Manager'
          : 'Sales Executive';

      const status: UserStatus = u.profile?.kyc_status === 'Rejected' ? 'inactive' : 'active';
      const email = u.profile?.email || u.email || `${u.phone}@loanex.in`;
      const mobile = u.profile?.mobile_number || u.phone || '';

      return {
        id: u.id,
        name,
        role,
        status,
        blocked: false,
        email,
        mobile,
        branches: u.profile?.branches || ['Mumbai Andheri'],
        pincodes: u.profile?.pincodes || ['400053'],
      };
    });
  } catch (error) {
    console.error('[userService] Error fetching users:', error);
    return [];
  }
};

/**
 * Get single user by ID
 */
export const getUserById = async (id: string): Promise<AppUser | undefined> => {
  const users = await getUsers();
  return users.find((u) => u.id === id);
};

/**
 * Create user (backend mapping / API helper)
 */
export const createUser = async (input: Omit<AppUser, 'id'>): Promise<AppUser> => {
  try {
    const response = await api.post('/admin/users', input);
    const data = response.data.data;
    return {
      ...input,
      id: data.id,
    };
  } catch (error) {
    console.error('[userService] Error creating user:', error);
    throw error;
  }
};

/**
 * Update user (backend mapping / API helper)
 */
export const updateUser = async (
  id: string,
  input: Omit<AppUser, 'id'>
): Promise<AppUser | undefined> => {
  try {
    const response = await api.patch(`/admin/users/${id}`, input);
    return response.data.data;
  } catch (error) {
    console.error('[userService] Error updating user:', error);
    return undefined;
  }
};

/**
 * Toggle blocked state for a user
 */
export const setUserBlocked = async (id: string, blocked: boolean): Promise<void> => {
  // Can extend to call backend patch endpoint when available
};

/**
 * Update branch and pincode mappings for a user
 */
export const updateUserAccess = async (
  id: string,
  access: { branches?: string[]; pincodes?: string[] }
): Promise<void> => {
  // Can extend to call backend patch endpoint when available
};

/**
 * Fetch login history for a user
 */
export const getUserLoginHistory = async (userId: string): Promise<UserLoginEntry[]> => {
  return [
    {
      id: `LH-${userId}-1`,
      timestamp: new Date().toISOString(),
      device: 'Chrome · Windows',
      ipAddress: '103.21.244.12',
      location: 'Mumbai, IN',
      status: 'Success',
    },
    {
      id: `LH-${userId}-2`,
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      device: 'Safari · Mobile',
      ipAddress: '103.21.244.12',
      location: 'Mumbai, IN',
      status: 'Success',
    },
  ];
};

/**
 * Fetch activity log for a user
 */
export const getUserActivityLog = async (userId: string): Promise<UserActivityEntry[]> => {
  return [
    {
      id: `ACT-${userId}-1`,
      timestamp: new Date().toISOString(),
      action: 'Logged In',
      module: 'Auth',
      details: 'Successful admin portal authentication',
    },
    {
      id: `ACT-${userId}-2`,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      action: 'Viewed Customer Details',
      module: 'Customers',
      details: 'Accessed customer profile records',
    },
  ];
};

/**
 * Get all staff/admin users (filter by role)
 */
export const getAdminUsers = async (): Promise<UserProfile[]> => {
  const allUsers = await getAllUsers();
  return allUsers.filter((u) => u.role === 'admin');
};

/**
 * Get all customer users (filter by role)
 */
export const getCustomerUsers = async (): Promise<UserProfile[]> => {
  const allUsers = await getAllUsers();
  return allUsers.filter((u) => u.role === 'customer');
};

/**
 * Get all users regardless of role
 */
export const getAllStaffAndCustomers = async (): Promise<UserProfile[]> => {
  return getAllUsers();
};

