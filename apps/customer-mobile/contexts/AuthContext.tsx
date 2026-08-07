import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '../types';
import * as authService from '../services/authService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (phone: string) => Promise<{ success: boolean }>;
  verifyOTP: (phone: string, otp: string) => Promise<{ user: User | null; error?: string }>;
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

  const login = async (phone: string) => authService.sendOTP(phone);

  const verifyOTP = async (phone: string, otp: string) => {
    const result = await authService.verifyOTP(phone, otp);
    if (result.user) setUser(result.user);
    return result;
  };

  const logout = async () => { await authService.logout(); setUser(null); };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, verifyOTP, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
