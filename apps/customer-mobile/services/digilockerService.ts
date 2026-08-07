import { SERVER_URL } from '../constants/config';
import { supabase } from '../lib/supabase';

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

const BASE_URL = SERVER_URL;

/**
 * Calls our backend to generate a DigiLocker auth token for the given Aadhaar.
 * The returned `url` should be opened in a WebView for the user to authenticate.
 */
export async function generateDigiLockerToken(): Promise<DigiLockerToken> {
  const res = await fetch(`${BASE_URL}/api/kyc/digilocker/generate-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = err.details ? `${err.error}: ${err.details}` : err.error || 'Failed to generate DigiLocker token';
    throw new Error(errorMessage);
  }

  return res.json();
}

/**
 * Calls our backend to fetch verified DigiLocker details after the user authenticates.
 */
export async function fetchDigiLockerDetails(clientId: string): Promise<DigiLockerDetails> {
  const res = await fetch(`${BASE_URL}/api/kyc/digilocker/fetch-details`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || err.details || 'Failed to fetch DigiLocker details');
  }

  return res.json();
}

/**
 * Extract name from DigiLocker fetchDetails response.
 * IDSPay response shape:
 *   data.digilocker_metadata.name
 *   data.aadhaar_xml_data.full_name
 */
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

/**
 * Extract masked Aadhaar number from DigiLocker fetchDetails response.
 */
export function extractAadhaarFromDetails(data: any): string {
  if (!data) return '';
  return (
    data.aadhaar_xml_data?.masked_aadhaar ||
    data.masked_aadhaar ||
    data.data?.masked_aadhaar ||
    ''
  );
}

/**
 * Extract address from DigiLocker fetchDetails response.
 * IDSPay shape:
 *   data.aadhaar_xml_data.full_address
 *   data.aadhaar_xml_data.address.{house,street,loc,vtc,subdist,dist,state,country,po}
 *   data.aadhaar_xml_data.zip
 */
export function extractAddressFromDetails(data: any): { fullAddress: string; city: string; state: string; pincode: string } {
  if (!data) return { fullAddress: '', city: '', state: '', pincode: '' };

  const xml = data.aadhaar_xml_data || data.document || data.data || data;
  const addr = xml.address || {};

  // Build a readable full address from structured Aadhaar fields
  const parts = [
    addr.house, addr.street, addr.loc, addr.vtc, addr.subdist,
    addr.dist, addr.state, addr.country,
  ].filter(Boolean);

  return {
    fullAddress: xml.full_address || (parts.length ? parts.join(', ') : ''),
    city: addr.dist || addr.loc || addr.vtc || xml.city || '',
    state: addr.state || xml.state || '',
    pincode: xml.zip || addr.po || xml.pincode || xml.zip_code || '',
  };
}

export async function saveDigiLockerReport(userId: string, data: any) {
  const xml = data.aadhaar_xml_data || {};
  const meta = data.digilocker_metadata || {};

  const { error } = await supabase.from('digilocker_reports').insert({
    profile_id: userId,
    client_id: data.client_id,
    name: xml.full_name || meta.name,
    gender: xml.gender || meta.gender,
    dob: xml.dob || meta.dob,
    care_of: xml.care_of,
    yob: xml.yob,
    zip: xml.zip,
    masked_aadhaar: xml.masked_aadhaar,
    full_address: xml.full_address,
    father_name: xml.father_name,
    profile_image: xml.profile_image,
    xml_url: data.xml_url,
    raw_data: data
  });

  if (error) {
    console.warn('Could not save to digilocker_reports (RLS enabled), but data is saved via customer_kyc anyway:', error.message);
  }
}
