import { Banner } from '../types';
import { api } from '../lib/apiClient';

export async function getBanners(): Promise<Banner[]> {
  try {
    const res = await api.get('/banners');
    return res.data;
  } catch {
    return [];
  }
}

export async function getBanner(id: string): Promise<Banner | null> {
  const { data } = await api.get(`/banners/${id}`);
  return data || null;
}

export async function createBanner(b: Omit<Banner, 'id' | 'createdAt'>): Promise<Banner> {
  const res = await api.post('/banners', b);
  return res.data;
}

export async function updateBanner(id: string, updates: Partial<Banner>): Promise<void> {
  await api.put(`/banners/${id}`, updates);
}

export async function deleteBanner(id: string): Promise<void> {
  await api.delete(`/banners/${id}`);
}
