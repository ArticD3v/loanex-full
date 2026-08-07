import { Address } from '../types';
import { api } from '../lib/apiClient';

function mapAddress(data: any): Address {
  return {
    id: data.id,
    userId: data.userId,
    fullAddress: data.addressLine1 + (data.addressLine2 ? ', ' + data.addressLine2 : ''),
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    isDefault: data.isDefault,
  };
}

export async function getAddresses(userId: string): Promise<Address[]> {
  try {
    const res = await api.get('/profile/addresses');
    return res.data.map(mapAddress);
  } catch (err: any) {
    console.error('Error fetching addresses:', err.message);
    return [];
  }
}

export async function addAddress(userId: string, address: Omit<Address, 'id' | 'userId'>): Promise<Address> {
  const payload = {
    addressLine1: address.fullAddress,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    isDefault: address.isDefault
  };
  const res = await api.post('/profile/addresses', payload);
  return mapAddress(res.data);
}

export async function updateAddress(addressId: string, address: Partial<Address>): Promise<Address> {
  const payload: any = {};
  if (address.fullAddress) payload.addressLine1 = address.fullAddress;
  if (address.city) payload.city = address.city;
  if (address.state) payload.state = address.state;
  if (address.pincode) payload.pincode = address.pincode;
  if (address.isDefault !== undefined) payload.isDefault = address.isDefault;

  const res = await api.put(`/profile/addresses/${addressId}`, payload);
  return mapAddress(res.data);
}

export async function deleteAddress(addressId: string): Promise<void> {
  await api.delete(`/profile/addresses/${addressId}`);
}

export async function setDefaultAddress(userId: string, addressId: string): Promise<void> {
  await api.put(`/profile/addresses/${addressId}/default`, {});
}
