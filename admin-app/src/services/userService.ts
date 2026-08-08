import { getAllUsers, UserProfile } from './customerService';
import { AppUser, UserRole, UserStatus, UserLoginEntry, UserActivityEntry } from '../types/user';
import api from './api';
function mapBackendUser(u: any): AppUser {
  const name =
    u.profile?.fullName ||
    (u.email ? u.email.split('@')[0] : `User ${u.id.slice(0, 6)}`);

  // Role name comes from the backend RBAC system; fall back to legacy labels.
  const role: string =
    u.roleName ||
    (u.role === 'admin' ? 'Super Admin' : u.role === 'customer' ? 'Customer' : u.role);

  const status: UserStatus = u.profile?.kyc_status === 'Rejected' ? 'inactive' : 'active';
  const email = u.profile?.email || u.email || (u.phone ? `${u.phone}@loanex.in` : '');
  const mobile = u.profile?.mobile_number || u.phone || '';

  return {
    id: u.id,
    name,
    role,
    roleId: u.roleId ?? null,
    status,
    blocked: u.status === 'BLOCKED' || u.status === 'blocked' || u.blocked === true,
    email,
    mobile,
    branches: u.profile?.branches || ['Mumbai Andheri'],
    pincodes: u.profile?.pincodes || ['400053'],
  };
}

export const getUsers = async (): Promise<AppUser[]> => {
  try {
    const users = await getAllUsers();
    return users.map(mapBackendUser);
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
    const response = await api.post('/admin/users', {
      name: input.name,
      email: input.email,
      mobile: input.mobile,
      roleId: input.roleId ?? undefined,
      password: input.password,
      branches: input.branches,
      pincodes: input.pincodes,
    });
    const data = response.data.data;
    return {
      ...input,
      id: data.id,
      role: data.roleName ?? input.role,
      roleId: data.roleId ?? input.roleId ?? null,
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
    const response = await api.patch(`/admin/users/${id}`, {
      name: input.name,
      email: input.email,
      mobile: input.mobile,
      roleId: input.roleId ?? undefined,
      password: input.password || undefined,
      branches: input.branches,
      pincodes: input.pincodes,
    });
    const data = response.data.data;
    return {
      ...input,
      id: data.id,
      role: data.roleName ?? input.role,
      roleId: data.roleId ?? input.roleId ?? null,
    };
  } catch (error) {
    console.error('[userService] Error updating user:', error);
    throw error;
  }
};

/**
 * Toggle blocked state for a user
 */
export const setUserBlocked = async (id: string, blocked: boolean): Promise<void> => {
  await api.patch(`/admin/users/${id}`, { blocked });
};

/**
 * Update branch and pincode mappings for a user
 */
export const updateUserAccess = async (
  id: string,
  access: { branches?: string[]; pincodes?: string[] }
): Promise<void> => {
  await api.patch(`/admin/users/${id}`, {
    branches: access.branches,
    pincodes: access.pincodes,
  });
};

/**
 * Fetch login history for a user
 */
export const getUserLoginHistory = async (userId: string): Promise<UserLoginEntry[]> => {
  try {
    const logs = await getUserActivityLog(userId);
    return logs
      .filter((entry) => entry.action.toUpperCase() === 'LOGIN')
      .map((entry) => ({
        id: entry.id,
        timestamp: entry.timestamp,
        device: entry.module === 'Auth' ? entry.details : 'Web Admin Portal',
        ipAddress: entry.ipAddress ?? '',
        location: entry.location ?? '',
        status: entry.status === 'failed' ? 'Failed' : 'Success',
      }));
  } catch (error) {
    console.warn('[userService] Failed to load login history:', error);
    return [];
  }
};

/**
 * Fetch activity log for a user
 */
export const getUserActivityLog = async (userId: string): Promise<UserActivityEntry[]> => {
  try {
    const response = await api.get(`/admin/users/${userId}/activity`);
    const data = response.data?.data ?? [];
    const list = Array.isArray(data) ? data : data.items || [];
    return list.map((entry: any) => ({
      id: entry.id,
      timestamp: entry.createdAt || new Date().toISOString(),
      action: formatAction(entry.action),
      module: entry.entityType || 'System',
      details: entry.changes?.details ?? describeAction(entry.action),
      ipAddress: entry.changes?.ipAddress ?? '',
      location: entry.changes?.location ?? '',
      status: entry.changes?.status ?? 'success',
    }));
  } catch (error) {
    console.warn('[userService] Failed to load activity log:', error);
    return [];
  }
};

function formatAction(action: string): string {
  return String(action || '')
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function describeAction(action: string): string {
  const map: Record<string, string> = {
    LOGIN: 'Successful admin portal login',
    ORDER_VIEWED: 'Viewed order details',
    ORDER_STATUS_UPDATED: 'Updated order status',
    EMI_APPLICATION_SUBMITTED: 'Submitted an EMI application',
    EMI_APPLICATION_APPROVED: 'Approved an EMI application',
    EMI_APPLICATION_REJECTED: 'Rejected an EMI application',
    EMI_PAYMENT_PAID: 'Completed an EMI payment',
    LOAN_CREATED: 'Created a loan account',
  };
  return map[String(action).toUpperCase()] ?? `Performed ${formatAction(action)}`;
}

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

