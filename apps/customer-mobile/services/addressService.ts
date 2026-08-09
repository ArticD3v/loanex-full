import { Address } from '../types';
import { api } from '../lib/apiClient';

/**
 * Map a backend address row (GET/POST /profile/addresses payloads) to the
 * mobile Address shape. The backend returns `addressLine1`/`addressLine2`
 * (derived from house_number/street) plus `addressType` (SHIPPING/BILLING).
 */
function mapAddress(data: any): Address {
  return {
    id: data.id,
    userId: data.userId ?? data.profileId ?? '',
    label: data.addressType === 'BILLING' ? 'Billing' : 'Home',
    fullAddress:
      [data.addressLine1, data.addressLine2].filter(Boolean).join(', ') || '',
    city: data.city ?? '',
    state: data.state ?? '',
    pincode: data.pincode ?? '',
    isDefault: Boolean(data.isDefault),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/** The backend list endpoints respond with `{ items, totalItems }`. */
function unwrapList(res: any): any[] {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.items) ? data.items : [];
}

export async function getAddresses(userId: string): Promise<Address[]> {
  try {
    const res = await api.get('/profile/addresses');
    return unwrapList(res).map(mapAddress);
  } catch (err: any) {
    console.error('Error fetching addresses:', err.message);
    return [];
  }
}

/**
 * Create a shipping address. The backend responds with the full address list,
 * so pick the newly created row (default first, else the newest).
 */
export async function addAddress(userId: string, address: Omit<Address, 'id' | 'userId'>): Promise<Address> {
  const payload = {
    addressLine1: address.fullAddress,
    addressLine2: '',
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    isDefault: address.isDefault,
    addressType: 'SHIPPING',
  };
  const res = await api.post('/profile/addresses', payload);
  const list = unwrapList(res).map(mapAddress);
  const created =
    list.find(a => a.isDefault) ??
    list[list.length - 1] ??
    list[0];
  if (!created) {
    // Fallback: build a local row from the input so the caller still gets a
    // usable address (save succeeded even if the response shape changed).
    return {
      id: '',
      userId,
      label: address.label ?? 'Home',
      fullAddress: address.fullAddress,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      isDefault: address.isDefault,
    };
  }
  return created;
}

export async function updateAddress(addressId: string, address: Partial<Address>): Promise<Address> {
  const payload: any = {};
  if (address.fullAddress) payload.addressLine1 = address.fullAddress;
  if (address.city) payload.city = address.city;
  if (address.state) payload.state = address.state;
  if (address.pincode) payload.pincode = address.pincode;
  if (address.isDefault !== undefined) payload.isDefault = address.isDefault;

  const res = await api.put(`/profile/addresses/${addressId}`, payload);
  const list = unwrapList(res).map(mapAddress);
  return list.find(a => a.id === addressId) ?? list[0];
}

export async function deleteAddress(addressId: string): Promise<void> {
  await api.delete(`/profile/addresses/${addressId}`);
}

export async function setDefaultAddress(userId: string, addressId: string): Promise<void> {
  await api.put(`/profile/addresses/${addressId}/default`, {});
}
