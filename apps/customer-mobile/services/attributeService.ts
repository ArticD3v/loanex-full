import { api } from '../lib/apiClient';
import { ProductAttribute, ProductAttributeValue } from '../types';

function mapAttribute(data: any): ProductAttribute {
  return {
    id: data.id,
    name: data.name,
    status: data.status,
    createdAt: data.createdAt || data.created_at,
  };
}

function mapAttributeValue(data: any): ProductAttributeValue {
  return {
    id: data.id,
    attributeId: data.attributeId || data.attribute_id,
    value: data.value,
    status: data.status,
    createdAt: data.createdAt || data.created_at,
  };
}

/** Master data via Backend API → MongoDB. */
export async function getAttributes(): Promise<ProductAttribute[]> {
  const res = await api.get('/admin/product_attributes');
  const items = res.data || [];
  return (Array.isArray(items) ? items : []).map(mapAttribute);
}

export async function getAttribute(id: string): Promise<ProductAttribute | null> {
  const items = await getAttributes();
  return items.find((a) => a.id === id) || null;
}

export async function createAttribute(
  a: Omit<ProductAttribute, 'id' | 'createdAt'>,
): Promise<ProductAttribute> {
  const res = await api.post('/admin/product_attributes', {
    name: a.name,
    status: a.status,
  });
  return mapAttribute(res.data);
}

export async function updateAttribute(
  id: string,
  a: Partial<Omit<ProductAttribute, 'id' | 'createdAt'>>,
): Promise<ProductAttribute> {
  const payload: any = {};
  if (a.name !== undefined) payload.name = a.name;
  if (a.status !== undefined) payload.status = a.status;
  const res = await api.put(`/admin/product_attributes/${id}`, payload);
  return mapAttribute(res.data);
}

export async function deleteAttribute(id: string): Promise<void> {
  await api.delete(`/admin/product_attributes/${id}`);
}

export async function getValues(attributeId: string): Promise<ProductAttributeValue[]> {
  const res = await api.get('/admin/product_attribute_values');
  const items = res.data || [];
  return (Array.isArray(items) ? items : [])
    .map(mapAttributeValue)
    .filter((v) => v.attributeId === attributeId);
}

export async function getValue(id: string): Promise<ProductAttributeValue | null> {
  const res = await api.get('/admin/product_attribute_values');
  const items = (res.data || []).map(mapAttributeValue);
  return items.find((v: ProductAttributeValue) => v.id === id) || null;
}

export async function createValue(
  v: Omit<ProductAttributeValue, 'id' | 'createdAt'>,
): Promise<ProductAttributeValue> {
  const res = await api.post('/admin/product_attribute_values', {
    attributeId: v.attributeId,
    value: v.value,
    status: v.status,
  });
  return mapAttributeValue(res.data);
}

export async function updateValue(
  id: string,
  v: Partial<Omit<ProductAttributeValue, 'id' | 'createdAt'>>,
): Promise<ProductAttributeValue> {
  const payload: any = {};
  if (v.attributeId !== undefined) payload.attributeId = v.attributeId;
  if (v.value !== undefined) payload.value = v.value;
  if (v.status !== undefined) payload.status = v.status;
  const res = await api.put(`/admin/product_attribute_values/${id}`, payload);
  return mapAttributeValue(res.data);
}

export async function deleteValue(id: string): Promise<void> {
  await api.delete(`/admin/product_attribute_values/${id}`);
}
