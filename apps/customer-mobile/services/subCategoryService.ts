import { api } from '../lib/apiClient';
import { SubCategory } from '../types';

function mapSubCategory(data: any): SubCategory {
  return {
    id: data.id,
    categoryId: data.categoryId || data.category_id,
    name: data.name,
    description: data.description || '',
    image: data.image || '',
    sortOrder: data.sortOrder ?? data.sort_order ?? 0,
    status: data.status,
    createdAt: data.createdAt || data.created_at,
  };
}

/** Master data via Backend API → MongoDB. */
export async function getSubCategories(): Promise<SubCategory[]> {
  const res = await api.get('/admin/sub_categories');
  const items = res.data || [];
  return (Array.isArray(items) ? items : []).map(mapSubCategory);
}

export async function getSubCategoriesByCategory(categoryId: string): Promise<SubCategory[]> {
  const all = await getSubCategories();
  return all.filter((s) => s.categoryId === categoryId);
}

export async function getSubCategory(id: string): Promise<SubCategory | null> {
  const items = await getSubCategories();
  return items.find((s) => s.id === id) || null;
}

export async function createSubCategory(
  s: Omit<SubCategory, 'id' | 'createdAt'>,
): Promise<SubCategory> {
  const res = await api.post('/admin/sub_categories', {
    categoryId: s.categoryId,
    name: s.name,
    description: s.description,
    image: s.image,
    sortOrder: s.sortOrder,
    status: s.status,
  });
  return mapSubCategory(res.data);
}

export async function updateSubCategory(
  id: string,
  s: Partial<Omit<SubCategory, 'id' | 'createdAt'>>,
): Promise<SubCategory> {
  const payload: any = {};
  if (s.categoryId !== undefined) payload.categoryId = s.categoryId;
  if (s.name !== undefined) payload.name = s.name;
  if (s.description !== undefined) payload.description = s.description;
  if (s.image !== undefined) payload.image = s.image;
  if (s.sortOrder !== undefined) payload.sortOrder = s.sortOrder;
  if (s.status !== undefined) payload.status = s.status;
  const res = await api.put(`/admin/sub_categories/${id}`, payload);
  return mapSubCategory(res.data);
}

export async function deleteSubCategory(id: string): Promise<void> {
  await api.delete(`/admin/sub_categories/${id}`);
}
