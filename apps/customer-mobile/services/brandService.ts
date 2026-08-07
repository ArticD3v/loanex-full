import { Brand } from '../types';
import { api } from '../lib/apiClient';

export async function getBrands(): Promise<Brand[]> {
  try {
    const res = await api.get('/brands');
    return res.data;
  } catch {
    return [];
  }
}

export async function getBrand(id: string): Promise<Brand | null> {
  const { data } = await api.get(`/brands/${id}`);
  return data || null;
}

export async function createBrand(b: Omit<Brand, 'id' | 'createdAt'>): Promise<Brand> {
  const res = await api.post('/brands', b);
  return res.data;
}

export async function updateBrand(id: string, updates: Partial<Brand>): Promise<void> {
  await api.put(`/brands/${id}`, updates);
}

export async function deleteBrand(id: string): Promise<void> {
  await api.delete(`/brands/${id}`);
}
