import { CustomerKYC } from '../types';
import { api } from '../lib/apiClient';

export async function getKYC(userId: string): Promise<CustomerKYC | null> {
  try {
    const res = await api.get(`/legacy/kyc/${userId}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function saveKYC(userId: string, kyc: any): Promise<CustomerKYC> {
  throw new Error('Not implemented for legacy wrapper');
}

export function generateDemoCIBIL(): number { return Math.floor(Math.random() * 200) + 650; }
export async function simulateFaceVerification(): Promise<boolean> { return true; }
export function validateAadhar(aadhar: string): boolean { return /^\d{12}$/.test(aadhar); }
export async function validatePAN(pan: string): Promise<any> { return { valid: true, data: { status: 'Active' } }; }
export async function fetchExperianReport(params: any) { return { success: true, score: 750 }; }
