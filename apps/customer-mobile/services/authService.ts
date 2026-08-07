import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { SERVER_URL } from '../constants/config';

const DEV_USER_KEY = '@loanex_dev_user';
const ACCESS_TOKEN_KEY = '@loanex_access_token';

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

export async function sendOTP(phone: string): Promise<{ success: boolean }> {
  const cleanPhone = phone.replace(/\D/g, '');
  try {
    await apiPost('/send-otp', { mobile: cleanPhone, purpose: 'LOGIN' });
    return { success: true };
  } catch (err) {
    // If user not found, they need to register
    try {
      await apiPost('/send-otp', { mobile: cleanPhone, purpose: 'REGISTER' });
      return { success: true };
    } catch {
      return { success: false };
    }
  }
}

export async function verifyOTP(phone: string, otp: string): Promise<{ user: User | null; error?: string }> {
  const cleanPhone = phone.replace(/\D/g, '');
  const cleanOtp = otp.replace(/\D/g, '');

  try {
    let result;
    try {
      result = await apiPost('/verify-otp', { mobile: cleanPhone, otp: cleanOtp, purpose: 'LOGIN' });
    } catch {
      result = await apiPost('/verify-otp', { mobile: cleanPhone, otp: cleanOtp, purpose: 'REGISTER' });
    }

    if (!result.verified) return { user: null, error: 'Invalid OTP' };

    const user: User = {
      id: result.user.id,
      phone: result.user.mobile,
      name: result.user.fullName,
      email: result.user.email,
      role: 'customer',
      createdAt: result.user.createdAt,
    };

    await AsyncStorage.setItem(DEV_USER_KEY, JSON.stringify(user));
    if (result.accessToken) {
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
    }
    
    return { user };
  } catch (err: any) {
    return { user: null, error: err.message };
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
        'Authorization': `Bearer ${token}` 
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

