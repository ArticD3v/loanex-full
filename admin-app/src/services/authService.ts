import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { API_CONFIG } from './config';

export interface User {
  id: string;
  phone: string;
  email?: string;
  role: 'customer' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

/**
 * Send OTP to the given phone number
 */
export const sendOtp = async (phone: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.post('/auth/send-otp', { phone });
  return response.data;
};

/**
 * Verify OTP and receive JWT token + user data
 */
export const verifyOtp = async (phone: string, otp: string): Promise<AuthResponse> => {
  const response = await api.post('/auth/verify-otp', { phone, otp });
  const { token, user } = response.data.data;
  return { token, user };
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

  return {
    id: String(raw.id ?? stored?.id ?? ''),
    phone: String(raw.phone ?? raw.mobile ?? stored?.phone ?? ''),
    email: raw.email ?? stored?.email,
    role: raw.role === 'customer' || raw.role === 'admin'
      ? raw.role
      : stored?.role ?? 'admin',
    created_at: String(raw.created_at ?? raw.createdAt ?? stored?.created_at ?? new Date().toISOString()),
    updated_at: String(raw.updated_at ?? raw.updatedAt ?? stored?.updated_at ?? new Date().toISOString()),
  };
};

/**
 * Logout — clear token on server and locally
 */
export const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    // Ignore errors on logout — we still want to clear local data
    console.warn('[Auth] Server logout failed:', error);
  }
  await clearAuth();
};

/**
 * Refresh the JWT token
 */
export const refreshToken = async (): Promise<string> => {
  const response = await api.post('/auth/refresh');
  const newToken = response.data.data.token;
  await storeToken(newToken);
  return newToken;
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
  await storeUser(user);

  return user;
};
