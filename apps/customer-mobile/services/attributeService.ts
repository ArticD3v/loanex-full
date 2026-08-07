import { supabase } from '../lib/supabase';
import { ProductAttribute, ProductAttributeValue } from '../types';

function mapAttribute(data: any): ProductAttribute {
  return {
    id: data.id, name: data.name, status: data.status, createdAt: data.created_at,
  };
}

function mapAttributeValue(data: any): ProductAttributeValue {
  return {
    id: data.id, attributeId: data.attribute_id, value: data.value,
    status: data.status, createdAt: data.created_at,
  };
}

export async function getAttributes(): Promise<ProductAttribute[]> {
  const { data } = await supabase.from('product_attributes').select('*').order('name');
  return (data || []).map(mapAttribute);
}

export async function getAttribute(id: string): Promise<ProductAttribute | null> {
  const { data } = await supabase.from('product_attributes').select('*').eq('id', id).single();
  return data ? mapAttribute(data) : null;
}

export async function createAttribute(a: Omit<ProductAttribute, 'id' | 'createdAt'>): Promise<ProductAttribute> {
  const { data, error } = await supabase.from('product_attributes').insert({
    name: a.name, status: a.status,
  }).select().single();
  if (error) throw error;
  return mapAttribute(data);
}

export async function updateAttribute(id: string, a: Partial<Omit<ProductAttribute, 'id' | 'createdAt'>>): Promise<ProductAttribute> {
  const payload: any = {};
  if (a.name !== undefined) payload.name = a.name;
  if (a.status !== undefined) payload.status = a.status;
  payload.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from('product_attributes').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return mapAttribute(data);
}

export async function deleteAttribute(id: string): Promise<void> {
  await supabase.from('product_attributes').delete().eq('id', id);
}

export async function getValues(attributeId: string): Promise<ProductAttributeValue[]> {
  const { data } = await supabase
    .from('product_attribute_values')
    .select('*')
    .eq('attribute_id', attributeId)
    .order('value');
  return (data || []).map(mapAttributeValue);
}

export async function getValue(id: string): Promise<ProductAttributeValue | null> {
  const { data } = await supabase.from('product_attribute_values').select('*').eq('id', id).single();
  return data ? mapAttributeValue(data) : null;
}

export async function createValue(v: Omit<ProductAttributeValue, 'id' | 'createdAt'>): Promise<ProductAttributeValue> {
  const { data, error } = await supabase.from('product_attribute_values').insert({
    attribute_id: v.attributeId, value: v.value, status: v.status,
  }).select().single();
  if (error) throw error;
  return mapAttributeValue(data);
}

export async function updateValue(id: string, v: Partial<Omit<ProductAttributeValue, 'id' | 'createdAt'>>): Promise<ProductAttributeValue> {
  const payload: any = {};
  if (v.attributeId !== undefined) payload.attribute_id = v.attributeId;
  if (v.value !== undefined) payload.value = v.value;
  if (v.status !== undefined) payload.status = v.status;
  payload.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from('product_attribute_values').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return mapAttributeValue(data);
}

export async function deleteValue(id: string): Promise<void> {
  await supabase.from('product_attribute_values').delete().eq('id', id);
}
