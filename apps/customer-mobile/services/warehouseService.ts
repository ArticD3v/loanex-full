import { api } from '../lib/apiClient';
import { Warehouse } from '../types';

function mapWarehouse(data: any): Warehouse {
  return {
    id: data.id,
    name: data.name,
    address: data.address || '',
    contactPerson: data.contactPerson || data.contact_person || '',
    phone: data.phone || '',
    capacity: data.capacity ?? 0,
    status: data.status,
    createdAt: data.createdAt || data.created_at,
  };
}

/** Master data via Backend API → MongoDB. */
export async function getWarehouses(): Promise<Warehouse[]> {
  const res = await api.get('/admin/warehouses');
  const items = res.data || [];
  return (Array.isArray(items) ? items : []).map(mapWarehouse);
}

export async function getWarehouse(id: string): Promise<Warehouse | null> {
  const items = await getWarehouses();
  return items.find((w) => w.id === id) || null;
}

export async function createWarehouse(w: Omit<Warehouse, 'id' | 'createdAt'>): Promise<Warehouse> {
  const res = await api.post('/admin/warehouses', {
    name: w.name,
    address: w.address,
    contactPerson: w.contactPerson,
    phone: w.phone,
    capacity: w.capacity,
    status: w.status,
  });
  return mapWarehouse(res.data);
}

export async function updateWarehouse(
  id: string,
  w: Partial<Omit<Warehouse, 'id' | 'createdAt'>>,
): Promise<Warehouse> {
  const res = await api.put(`/admin/warehouses/${id}`, {
    ...(w.name !== undefined ? { name: w.name } : {}),
    ...(w.address !== undefined ? { address: w.address } : {}),
    ...(w.contactPerson !== undefined ? { contactPerson: w.contactPerson } : {}),
    ...(w.phone !== undefined ? { phone: w.phone } : {}),
    ...(w.capacity !== undefined ? { capacity: w.capacity } : {}),
    ...(w.status !== undefined ? { status: w.status } : {}),
  });
  return mapWarehouse(res.data);
}

export async function deleteWarehouse(id: string): Promise<void> {
  await api.delete(`/admin/warehouses/${id}`);
}
