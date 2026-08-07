import { supabase } from '../lib/supabase';
import { Manufacturer } from '../types';

function mapManufacturer(data: any): Manufacturer {
  return {
    id: data.id, name: data.name, gstNumber: data.gst_number, address: data.address || '',
    contactPerson: data.contact_person || '', phone: data.phone || '', email: data.email || '',
    status: data.status, createdAt: data.created_at,
  };
}

export async function getManufacturers(): Promise<Manufacturer[]> {
  const { data } = await supabase.from('manufacturers').select('*').order('name');
  return (data || []).map(mapManufacturer);
}

export async function getManufacturer(id: string): Promise<Manufacturer | null> {
  const { data } = await supabase.from('manufacturers').select('*').eq('id', id).single();
  return data ? mapManufacturer(data) : null;
}

export async function createManufacturer(m: Omit<Manufacturer, 'id' | 'createdAt'>): Promise<Manufacturer> {
  const { data, error } = await supabase.from('manufacturers').insert({
    name: m.name, gst_number: m.gstNumber, address: m.address,
    contact_person: m.contactPerson, phone: m.phone, email: m.email, status: m.status,
  }).select().single();
  if (error) throw error;
  return mapManufacturer(data);
}

export async function updateManufacturer(id: string, m: Partial<Omit<Manufacturer, 'id' | 'createdAt'>>): Promise<Manufacturer> {
  const payload: any = {};
  if (m.name !== undefined) payload.name = m.name;
  if (m.gstNumber !== undefined) payload.gst_number = m.gstNumber;
  if (m.address !== undefined) payload.address = m.address;
  if (m.contactPerson !== undefined) payload.contact_person = m.contactPerson;
  if (m.phone !== undefined) payload.phone = m.phone;
  if (m.email !== undefined) payload.email = m.email;
  if (m.status !== undefined) payload.status = m.status;
  payload.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from('manufacturers').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return mapManufacturer(data);
}

export async function deleteManufacturer(id: string): Promise<void> {
  await supabase.from('manufacturers').delete().eq('id', id);
}
