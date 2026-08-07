import { supabase } from '../lib/supabase';
import { Warehouse } from '../types';

function mapWarehouse(data: any): Warehouse {
  return {
    id: data.id, name: data.name, address: data.address || '',
    contactPerson: data.contact_person || '', phone: data.phone || '',
    capacity: data.capacity ?? 0, status: data.status, createdAt: data.created_at,
  };
}

export async function getWarehouses(): Promise<Warehouse[]> {
  const { data } = await supabase.from('warehouses').select('*').order('name');
  return (data || []).map(mapWarehouse);
}

export async function getWarehouse(id: string): Promise<Warehouse | null> {
  const { data } = await supabase.from('warehouses').select('*').eq('id', id).single();
  return data ? mapWarehouse(data) : null;
}

export async function createWarehouse(w: Omit<Warehouse, 'id' | 'createdAt'>): Promise<Warehouse> {
  const { data, error } = await supabase.from('warehouses').insert({
    name: w.name, address: w.address, contact_person: w.contactPerson,
    phone: w.phone, capacity: w.capacity, status: w.status,
  }).select().single();
  if (error) throw error;
  return mapWarehouse(data);
}

export async function updateWarehouse(id: string, w: Partial<Omit<Warehouse, 'id' | 'createdAt'>>): Promise<Warehouse> {
  const payload: any = {};
  if (w.name !== undefined) payload.name = w.name;
  if (w.address !== undefined) payload.address = w.address;
  if (w.contactPerson !== undefined) payload.contact_person = w.contactPerson;
  if (w.phone !== undefined) payload.phone = w.phone;
  if (w.capacity !== undefined) payload.capacity = w.capacity;
  if (w.status !== undefined) payload.status = w.status;
  payload.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from('warehouses').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return mapWarehouse(data);
}

export async function deleteWarehouse(id: string): Promise<void> {
  await supabase.from('warehouses').delete().eq('id', id);
}
