import { api } from '../lib/apiClient';

export interface DigiLockerToken {
  client_id: string;
  token: string;
  url: string;
  expiry_seconds: number;
}

export interface DigiLockerDetails {
  status: string;
  data?: any;
  error?: string;
}

/**
 * DigiLocker via Backend API → MongoDB (saves digilocker_reports server-side).
 */
export async function generateDigiLockerToken(): Promise<DigiLockerToken> {
  const res = await api.post('/verification/aadhaar/digilocker/generate', {});
  const data = res.data || {};
  const url = data.url || data.digilocker_url || '';
  const clientId = data.client_id || '';
  if (!clientId || !url) {
    throw new Error(res.message || 'Failed to generate DigiLocker token');
  }
  return {
    client_id: clientId,
    token: data.token || clientId,
    url,
    expiry_seconds: data.expiry_seconds ?? 600,
  };
}

export async function fetchDigiLockerDetails(clientId: string): Promise<DigiLockerDetails> {
  const res = await api.post('/verification/aadhaar/digilocker/fetch', {
    client_id: clientId,
  });
  const data = res.data || {};
  if (data.status === 'ok' || data.verified) {
    return { status: 'ok', data: data.data || data };
  }
  return {
    status: 'error',
    error: data.message || res.message || 'Failed to fetch DigiLocker details',
  };
}

export function extractNameFromDetails(data: any): string {
  if (!data) return '';
  return (
    data.aadhaar_xml_data?.full_name ||
    data.digilocker_metadata?.name ||
    data.full_name ||
    data.name ||
    data.Name ||
    data.document?.name ||
    data.data?.full_name ||
    data.data?.name ||
    ''
  );
}

export function extractAadhaarFromDetails(data: any): string {
  if (!data) return '';
  return (
    data.aadhaar_xml_data?.masked_aadhaar ||
    data.masked_aadhaar ||
    data.data?.masked_aadhaar ||
    ''
  );
}

export function extractAddressFromDetails(data: any): {
  fullAddress: string;
  city: string;
  state: string;
  pincode: string;
} {
  if (!data) return { fullAddress: '', city: '', state: '', pincode: '' };

  const xml = data.aadhaar_xml_data || data.document || data.data || data;
  const addr = xml.address || {};

  const parts = [
    addr.house,
    addr.street,
    addr.loc,
    addr.vtc,
    addr.subdist,
    addr.dist,
    addr.state,
    addr.country,
  ].filter(Boolean);

  return {
    fullAddress: xml.full_address || (parts.length ? parts.join(', ') : ''),
    city: addr.dist || addr.loc || addr.vtc || xml.city || '',
    state: addr.state || xml.state || '',
    pincode: xml.zip || addr.po || xml.pincode || xml.zip_code || '',
  };
}

/**
 * Persist is handled by POST /verification/aadhaar/digilocker/fetch on the backend.
 * Kept for UI call-sites; no-ops when already saved server-side.
 */
export async function saveDigiLockerReport(_userId: string, _data: any) {
  // Backend digilockerFetch already upserts digilocker_reports + customer_kyc.
}
