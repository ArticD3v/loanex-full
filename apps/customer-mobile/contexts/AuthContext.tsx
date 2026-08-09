import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '../types';
import * as authService from '../services/authService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOTP: (phone: string, otp: string, purpose?: authService.OtpPurpose) => Promise<{ user: User | null; error?: string }>;
  passwordLogin: (identifier: string, password: string) => Promise<{ user: User | null; error?: string }>;
  register: (input: { fullName: string; mobile: string; email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (mobile: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (mobile: string, otp: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authService.getCurrentUser().then(u => { setUser(u); setIsLoading(false); });
  }, []);

  const refreshUser = useCallback(async () => {
    const u = await authService.getCurrentUser();
    if (u) setUser(u);
  }, []);

  const login = async (phone: string) => authService.sendOTP(phone, 'REGISTER');

  const verifyOTP = async (phone: string, otp: string, purpose?: authService.OtpPurpose) => {
    const result = await authService.verifyOTP(phone, otp, purpose);
    if (result.user) setUser(result.user);
    return result;
  };

  const passwordLogin = async (identifier: string, password: string) => {
    const result = await authService.passwordLogin(identifier, password);
    if (result.user) setUser(result.user);
    return result;
  };

  const register = async (input: { fullName: string; mobile: string; email: string; password: string }) =>
    authService.register(input);

  const forgotPassword = async (mobile: string) => authService.forgotPassword(mobile);

  const resetPassword = async (mobile: string, otp: string, newPassword: string) =>
    authService.resetPassword(mobile, otp, newPassword);

  const logout = async () => { await authService.logout(); setUser(null); };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, verifyOTP, passwordLogin, register, forgotPassword, resetPassword, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
