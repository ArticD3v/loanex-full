export type UserStatus = 'active' | 'inactive';

/** Roles defined for LoanEx Super Admin user & role management */
export type UserRole =
  | 'Super Admin'
  | 'Branch Manager'
  | 'Credit Officer'
  | 'FI Executive'
  | 'Sales Executive';

/** Single source of truth for Role dropdown options */
export const USER_ROLE_OPTIONS: UserRole[] = [
  'Super Admin',
  'Branch Manager',
  'Credit Officer',
  'FI Executive',
  'Sales Executive',
];

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
}

export interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  blocked: boolean;
  email: string;
  mobile: string;
  branches: string[];
  pincodes: string[];
  /** Mock-only credential set on Add User — enables login */
  password?: string;
}
