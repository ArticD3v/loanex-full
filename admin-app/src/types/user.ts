export type UserStatus = 'active' | 'inactive';

/**
 * Role display name. Real role names come from the /admin/roles API
 * (dynamic and editable) rather than a fixed union.
 */
export type UserRole = string;

export interface UserLoginEntry {
  id: string;
  timestamp: string;
  device: string;
  ipAddress: string;
  location: string;
  status: 'Success' | 'Failed';
}

export interface UserActivityEntry {
  id: string;
  timestamp: string;
  action: string;
  module: string;
  details: string;
  ipAddress?: string;
  location?: string;
  status?: string;
}

export interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  /** RBAC role id from the backend (used when creating/updating a user). */
  roleId?: string | null;
  status: UserStatus;
  blocked: boolean;
  email: string;
  mobile: string;
  branches: string[];
  pincodes: string[];
  /** Mock-only credential set on Add User — enables login */
  password?: string;
}
