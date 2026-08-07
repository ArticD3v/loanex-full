import { supabase } from '../lib/supabase';
import { SubCategory } from '../types';

function mapSubCategory(data: any): SubCategory {
  return {
    id: data.id, categoryId: data.category_id, name: data.name,
    description: data.description || '', image: data.image || '',
    sortOrder: data.sort_order ?? 0, status: data.status, createdAt: data.created_at,
  };
}

export async function getSubCategories(): Promise<SubCategory[]> {
  const { data } = await supabase.from('sub_categories').select('*').order('sort_order');
  return (data || []).map(mapSubCategory);
}

export async function getSubCategoriesByCategory(categoryId: string): Promise<SubCategory[]> {
  const { data } = await supabase
    .from('sub_categories')
    .select('*')
    .eq('category_id', categoryId)
    .order('sort_order');
  return (data || []).map(mapSubCategory);
}

export async function getSubCategory(id: string): Promise<SubCategory | null> {
  const { data } = await supabase.from('sub_categories').select('*').eq('id', id).single();
  return data ? mapSubCategory(data) : null;
}

export async function createSubCategory(s: Omit<SubCategory, 'id' | 'createdAt'>): Promise<SubCategory> {
  const { data, error } = await supabase.from('sub_categories').insert({
    category_id: s.categoryId, name: s.name, description: s.description,
    image: s.image, sort_order: s.sortOrder, status: s.status,
  }).select().single();
  if (error) throw error;
  return mapSubCategory(data);
}

export async function updateSubCategory(id: string, s: Partial<Omit<SubCategory, 'id' | 'createdAt'>>): Promise<SubCategory> {
  const payload: any = {};
  if (s.categoryId !== undefined) payload.category_id = s.categoryId;
  if (s.name !== undefined) payload.name = s.name;
  if (s.description !== undefined) payload.description = s.description;
  if (s.image !== undefined) payload.image = s.image;
  if (s.sortOrder !== undefined) payload.sort_order = s.sortOrder;
  if (s.status !== undefined) payload.status = s.status;
  payload.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from('sub_categories').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return mapSubCategory(data);
}

export async function deleteSubCategory(id: string): Promise<void> {
  await supabase.from('sub_categories').delete().eq('id', id);
}
