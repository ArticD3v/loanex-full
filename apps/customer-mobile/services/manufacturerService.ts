import { api } from '../lib/apiClient';
import { Manufacturer } from '../types';

function mapManufacturer(data: any): Manufacturer {
  return {
    id: data.id,
    name: data.name,
    gstNumber: data.gstNumber || data.gst_number,
    address: data.address || '',
    contactPerson: data.contactPerson || data.contact_person || '',
    phone: data.phone || '',
    email: data.email || '',
    status: data.status,
    createdAt: data.createdAt || data.created_at,
  };
}

/** Master data via Backend API → MongoDB. */
export async function getManufacturers(): Promise<Manufacturer[]> {
  const res = await api.get('/admin/manufacturers');
  const items = res.data || [];
  return (Array.isArray(items) ? items : []).map(mapManufacturer);
}

export async function getManufacturer(id: string): Promise<Manufacturer | null> {
  const items = await getManufacturers();
  return items.find((m) => m.id === id) || null;
}

export async function createManufacturer(
  m: Omit<Manufacturer, 'id' | 'createdAt'>,
): Promise<Manufacturer> {
  const res = await api.post('/admin/manufacturers', {
    name: m.name,
    gstNumber: m.gstNumber,
    address: m.address,
    contactPerson: m.contactPerson,
    phone: m.phone,
    email: m.email,
    status: m.status,
  });
  return mapManufacturer(res.data);
}

export async function updateManufacturer(
  id: string,
  m: Partial<Omit<Manufacturer, 'id' | 'createdAt'>>,
): Promise<Manufacturer> {
  const payload: any = {};
  if (m.name !== undefined) payload.name = m.name;
  if (m.gstNumber !== undefined) payload.gstNumber = m.gstNumber;
  if (m.address !== undefined) payload.address = m.address;
  if (m.contactPerson !== undefined) payload.contactPerson = m.contactPerson;
  if (m.phone !== undefined) payload.phone = m.phone;
  if (m.email !== undefined) payload.email = m.email;
  if (m.status !== undefined) payload.status = m.status;
  const res = await api.put(`/admin/manufacturers/${id}`, payload);
  return mapManufacturer(res.data);
}

export async function deleteManufacturer(id: string): Promise<void> {
  await api.delete(`/admin/manufacturers/${id}`);
}
