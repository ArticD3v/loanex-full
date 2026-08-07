import { supabase } from '../lib/supabase';
import { Supplier } from '../types';

function mapSupplier(data: any): Supplier {
  return {
    id: data.id, name: data.name, code: data.code || '', gstNumber: data.gst_number,
    address: data.address || '', phone: data.phone || '', email: data.email || '',
    contactPerson: data.contact_person || '', bankDetails: data.bank_details || '',
    paymentTerms: data.payment_terms || '', status: data.status, createdAt: data.created_at,
  };
}

export async function getSuppliers(): Promise<Supplier[]> {
  const { data } = await supabase.from('suppliers').select('*').order('name');
  return (data || []).map(mapSupplier);
}

export async function getSupplier(id: string): Promise<Supplier | null> {
  const { data } = await supabase.from('suppliers').select('*').eq('id', id).single();
  return data ? mapSupplier(data) : null;
}

export async function createSupplier(s: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
  const { data, error } = await supabase.from('suppliers').insert({
    name: s.name, code: s.code, gst_number: s.gstNumber, address: s.address,
    phone: s.phone, email: s.email, contact_person: s.contactPerson,
    bank_details: s.bankDetails, payment_terms: s.paymentTerms, status: s.status,
  }).select().single();
  if (error) throw error;
  return mapSupplier(data);
}

export async function updateSupplier(id: string, s: Partial<Omit<Supplier, 'id' | 'createdAt'>>): Promise<Supplier> {
  const payload: any = {};
  if (s.name !== undefined) payload.name = s.name;
  if (s.code !== undefined) payload.code = s.code;
  if (s.gstNumber !== undefined) payload.gst_number = s.gstNumber;
  if (s.address !== undefined) payload.address = s.address;
  if (s.phone !== undefined) payload.phone = s.phone;
  if (s.email !== undefined) payload.email = s.email;
  if (s.contactPerson !== undefined) payload.contact_person = s.contactPerson;
  if (s.bankDetails !== undefined) payload.bank_details = s.bankDetails;
  if (s.paymentTerms !== undefined) payload.payment_terms = s.paymentTerms;
  if (s.status !== undefined) payload.status = s.status;
  payload.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from('suppliers').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return mapSupplier(data);
}

export async function deleteSupplier(id: string): Promise<void> {
  await supabase.from('suppliers').delete().eq('id', id);
}
