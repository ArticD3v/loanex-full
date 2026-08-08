import { api } from '../lib/apiClient';
import { Supplier } from '../types';

function mapSupplier(data: any): Supplier {
  return {
    id: data.id,
    name: data.name,
    code: data.code || '',
    gstNumber: data.gstNumber || data.gst_number,
    address: data.address || '',
    phone: data.phone || '',
    email: data.email || '',
    contactPerson: data.contactPerson || data.contact_person || '',
    bankDetails: data.bankDetails || data.bank_details || '',
    paymentTerms: data.paymentTerms || data.payment_terms || '',
    status: data.status,
    createdAt: data.createdAt || data.created_at,
  };
}

/** Master data via Backend API → MongoDB. */
export async function getSuppliers(): Promise<Supplier[]> {
  const res = await api.get('/admin/suppliers');
  const items = res.data || [];
  return (Array.isArray(items) ? items : []).map(mapSupplier);
}

export async function getSupplier(id: string): Promise<Supplier | null> {
  const items = await getSuppliers();
  return items.find((s) => s.id === id) || null;
}

export async function createSupplier(s: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
  const res = await api.post('/admin/suppliers', {
    name: s.name,
    code: s.code,
    gstNumber: s.gstNumber,
    address: s.address,
    phone: s.phone,
    email: s.email,
    contactPerson: s.contactPerson,
    bankDetails: s.bankDetails,
    paymentTerms: s.paymentTerms,
    status: s.status,
  });
  return mapSupplier(res.data);
}

export async function updateSupplier(
  id: string,
  s: Partial<Omit<Supplier, 'id' | 'createdAt'>>,
): Promise<Supplier> {
  const payload: any = {};
  if (s.name !== undefined) payload.name = s.name;
  if (s.code !== undefined) payload.code = s.code;
  if (s.gstNumber !== undefined) payload.gstNumber = s.gstNumber;
  if (s.address !== undefined) payload.address = s.address;
  if (s.phone !== undefined) payload.phone = s.phone;
  if (s.email !== undefined) payload.email = s.email;
  if (s.contactPerson !== undefined) payload.contactPerson = s.contactPerson;
  if (s.bankDetails !== undefined) payload.bankDetails = s.bankDetails;
  if (s.paymentTerms !== undefined) payload.paymentTerms = s.paymentTerms;
  if (s.status !== undefined) payload.status = s.status;
  const res = await api.put(`/admin/suppliers/${id}`, payload);
  return mapSupplier(res.data);
}

export async function deleteSupplier(id: string): Promise<void> {
  await api.delete(`/admin/suppliers/${id}`);
}
