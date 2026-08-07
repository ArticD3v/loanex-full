import { Category } from '../types';
import { api } from '../lib/apiClient';
import { CATEGORIES } from '../constants/config';

export async function getCategories(): Promise<Category[]> {
  try {
    const res = await api.get('/categories');
    if (res.data && res.data.length > 0) return res.data;
    return CATEGORIES as unknown as Category[];
  } catch {
    return CATEGORIES as unknown as Category[];
  }
}
