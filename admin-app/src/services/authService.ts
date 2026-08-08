import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { API_CONFIG } from './config';

export interface User {
  id: string;
  phone: string;
  email?: string;
  role: 'customer' | 'admin';
  roleId?: string | null;
  roleName?: string | null;
  permissions?: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Logout — clear local auth data.
 * Note: admin login issues an access token only (no refresh token),
 * so there is nothing to revoke server-side.
 */
export const logout = async (): Promise<void> => {
  await clearAuth();
};

/**
 * Store the JWT token in AsyncStorage
 */
export const storeToken = async (token: string): Promise<void> => {
  await AsyncStorage.setItem(API_CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
};

/**
 * Get the stored JWT token
 */
export const getToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem(API_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
};

/**
 * Store user data in AsyncStorage
 */
export const storeUser = async (user: User): Promise<void> => {
  await AsyncStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(user));
};

/**
 * Get stored user data
 */
export const getStoredUser = async (): Promise<User | null> => {
  const userData = await AsyncStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_DATA);
  return userData ? JSON.parse(userData) : null;
};

/**
 * Clear all auth data (token + user)
 */
export const clearAuth = async (): Promise<void> => {
  await AsyncStorage.multiRemove([
    API_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
    API_CONFIG.STORAGE_KEYS.USER_DATA,
  ]);
};

/**
 * Get current logged-in user from the API
 */
export const getMe = async (): Promise<User> => {
  const response = await api.get('/auth/me');
  const data = response.data?.data;
  // Backend returns { user: toPublicUser(...) }, not a flat User
  const raw = data?.user ?? data ?? {};
  const stored = await getStoredUser();

  const permissions = Array.isArray(raw.permissions)
    ? raw.permissions
    : stored?.permissions ?? [];

  return {
    id: String(raw.id ?? stored?.id ?? ''),
    phone: String(raw.phone ?? raw.mobile ?? stored?.phone ?? ''),
    email: raw.email ?? stored?.email,
    role: raw.role === 'customer' || raw.role === 'admin'
      ? raw.role
      : stored?.role ?? 'admin',
    roleId: raw.roleId ?? stored?.roleId ?? null,
    roleName: raw.roleName ?? stored?.roleName ?? null,
    permissions,
    created_at: String(raw.created_at ?? raw.createdAt ?? stored?.created_at ?? new Date().toISOString()),
    updated_at: String(raw.updated_at ?? raw.updatedAt ?? stored?.updated_at ?? new Date().toISOString()),
  };
};

/**
 * Full login flow for admin using email/phone and password
 * Throws if user is not an admin or credentials are invalid.
 */
export const loginAsAdmin = async (emailOrPhone: string, password: string): Promise<User> => {
  const response = await api.post('/auth/admin-login', { email: emailOrPhone, password });
  const { token, user } = response.data.data;

  if (user.role !== 'admin') {
    throw new Error('Access Denied: Only admin users can log in to this app.');
  }

  await storeToken(token);
  await storeUser({
    ...user,
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
  });

  return user;
};
