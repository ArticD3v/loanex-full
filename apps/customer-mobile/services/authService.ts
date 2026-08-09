import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { SERVER_URL } from '../constants/config';

const DEV_USER_KEY = '@loanex_dev_user';
const ACCESS_TOKEN_KEY = '@loanex_access_token';
const REFRESH_TOKEN_KEY = '@loanex_refresh_token';

export type OtpPurpose = 'REGISTER' | 'FORGOT_PASSWORD';

// Simple api helper for auth requests
async function apiPost(endpoint: string, data: any) {
  const res = await fetch(`${SERVER_URL}/api/v1/auth${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'API request failed');
  return json.data;
}

function mapUser(u: any, fallbackMobile?: string): User {
  return {
    id: u.id ?? '',
    phone: u.mobile ?? fallbackMobile ?? '',
    name: u.fullName ?? u.name ?? 'User',
    email: u.email,
    role: u.role === 'admin' ? 'admin' : 'customer',
    createdAt: u.createdAt ?? new Date().toISOString(),
  };
}

async function storeSession(user: User, accessToken?: string, refreshToken?: string) {
  await AsyncStorage.setItem(DEV_USER_KEY, JSON.stringify(user));
  if (accessToken) {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

/**
 * Send an OTP for a specific purpose.
 * - REGISTER: new-account signup (backend rejects when the mobile is already
 *   an active account).
 * - FORGOT_PASSWORD: password reset (backend rejects unknown mobiles).
 */
export async function sendOTP(phone: string, purpose: OtpPurpose = 'REGISTER'): Promise<{ success: boolean; error?: string }> {
  const cleanPhone = phone.replace(/\D/g, '');
  try {
    await apiPost('/send-otp', { mobile: cleanPhone, purpose });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to send OTP.' };
  }
}

/**
 * Verify an OTP for a specific purpose.
 * - REGISTER: activates a PENDING account (register flow) and logs the user in.
 * - FORGOT_PASSWORD: validates the code so the reset-password step can proceed
 *   (the code is NOT consumed here — the backend consumes it at reset).
 */
export async function verifyOTP(
  phone: string,
  otp: string,
  purpose: OtpPurpose = 'REGISTER',
): Promise<{ user: User | null; error?: string }> {
  const cleanPhone = phone.replace(/\D/g, '');
  const cleanOtp = otp.replace(/\D/g, '');

  try {
    const result = await apiPost('/verify-otp', {
      mobile: cleanPhone,
      otp: cleanOtp,
      purpose,
    });

    if (!result.verified) return { user: null, error: 'Invalid OTP' };

    if (purpose === 'FORGOT_PASSWORD') {
      // No session yet — the user still has to set a new password.
      return { user: null };
    }

    const user = mapUser(result.user ?? {}, cleanPhone);
    await storeSession(user, result.accessToken, result.refreshToken);
    return { user };
  } catch (err: any) {
    return { user: null, error: err.message || 'Invalid OTP' };
  }
}

/**
 * Password sign-in against the real backend. The backend deliberately
 * disabled LOGIN OTPs ("sign in with your password"), so existing customers
 * authenticate with their mobile/email + password.
 */
export async function passwordLogin(
  identifier: string,
  password: string,
): Promise<{ user: User | null; error?: string }> {
  try {
    const data = await apiPost('/login', { identifier, password });
    const user = mapUser(data.user ?? {}, identifier.replace(/\D/g, ''));
    await storeSession(user, data.accessToken, data.refreshToken);
    return { user };
  } catch (err: any) {
    return { user: null, error: err.message || 'Invalid credentials' };
  }
}

/**
 * Signup: create the account (PENDING) and send the REGISTER OTP.
 * The user then verifies the OTP (verifyOTP with purpose REGISTER), which
 * activates the account and returns a session.
 */
export async function register(input: {
  fullName: string;
  mobile: string;
  email: string;
  password: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await apiPost('/register', {
      fullName: input.fullName.trim(),
      mobile: input.mobile.replace(/\D/g, ''),
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Registration failed.' };
  }
}

/** Forgot password step 1: send the FORGOT_PASSWORD OTP. */
export async function forgotPassword(mobile: string): Promise<{ success: boolean; error?: string }> {
  const cleanPhone = mobile.replace(/\D/g, '');
  try {
    await apiPost('/forgot-password', { mobile: cleanPhone });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Unable to send reset OTP.' };
  }
}

/** Forgot password step 3: set the new password (backend validates the OTP). */
export async function resetPassword(
  mobile: string,
  otp: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const cleanPhone = mobile.replace(/\D/g, '');
  try {
    await apiPost('/reset-password', {
      mobile: cleanPhone,
      otp: otp.replace(/\D/g, ''),
      newPassword,
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Unable to reset password.' };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(DEV_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(DEV_USER_KEY);
  await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
  await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function updateProfile(updates: Partial<Pick<User, 'name' | 'email' | 'avatarUrl'>>): Promise<User | null> {
  const current = await getCurrentUser();
  if (!current) return null;

  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);

  const payload: any = {};
  if (updates.name !== undefined) payload.fullName = updates.name;
  if (updates.email !== undefined) payload.email = updates.email;

  if (Object.keys(payload).length > 0) {
    const res = await fetch(`${SERVER_URL}/api/v1/profile/personal`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
  }

  const updated = { ...current, ...updates };
  await AsyncStorage.setItem(DEV_USER_KEY, JSON.stringify(updated));
  return updated;
}

export async function getAllUsers(): Promise<User[]> {
  return []; // Not needed for customer app
}
