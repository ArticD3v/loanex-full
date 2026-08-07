import { supabase } from '../lib/supabase';
import { ProductVariant } from '../types';

function mapVariant(data: any): ProductVariant {
  return {
    id: data.id, productId: data.product_id, sku: data.sku || '', barcode: data.barcode || '',
    sellingPrice: data.selling_price ?? 0, purchasePrice: data.purchase_price ?? 0,
    gst: data.gst ?? 0, stock: data.stock ?? 0, reservedStock: data.reserved_stock ?? 0,
    images: data.images || [], weight: data.weight ?? 0, length: data.length ?? 0,
    width: data.width ?? 0, height: data.height ?? 0,
    status: data.status, createdAt: data.created_at,
  };
}

export async function getVariants(productId: string): Promise<ProductVariant[]> {
  const { data } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .order('created_at');
  return (data || []).map(mapVariant);
}

export async function getVariant(id: string): Promise<ProductVariant | null> {
  const { data } = await supabase.from('product_variants').select('*').eq('id', id).single();
  return data ? mapVariant(data) : null;
}

export async function createVariant(v: Omit<ProductVariant, 'id' | 'createdAt'>): Promise<ProductVariant> {
  const { data, error } = await supabase.from('product_variants').insert({
    product_id: v.productId, sku: v.sku, barcode: v.barcode,
    selling_price: v.sellingPrice, purchase_price: v.purchasePrice, gst: v.gst,
    stock: v.stock, reserved_stock: v.reservedStock, images: v.images,
    weight: v.weight, length: v.length, width: v.width, height: v.height,
    status: v.status,
  }).select().single();
  if (error) throw error;
  return mapVariant(data);
}

export async function updateVariant(id: string, v: Partial<Omit<ProductVariant, 'id' | 'createdAt'>>): Promise<ProductVariant> {
  const payload: any = {};
  if (v.productId !== undefined) payload.product_id = v.productId;
  if (v.sku !== undefined) payload.sku = v.sku;
  if (v.barcode !== undefined) payload.barcode = v.barcode;
  if (v.sellingPrice !== undefined) payload.selling_price = v.sellingPrice;
  if (v.purchasePrice !== undefined) payload.purchase_price = v.purchasePrice;
  if (v.gst !== undefined) payload.gst = v.gst;
  if (v.stock !== undefined) payload.stock = v.stock;
  if (v.reservedStock !== undefined) payload.reserved_stock = v.reservedStock;
  if (v.images !== undefined) payload.images = v.images;
  if (v.weight !== undefined) payload.weight = v.weight;
  if (v.length !== undefined) payload.length = v.length;
  if (v.width !== undefined) payload.width = v.width;
  if (v.height !== undefined) payload.height = v.height;
  if (v.status !== undefined) payload.status = v.status;
  payload.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from('product_variants').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return mapVariant(data);
}

export async function deleteVariant(id: string): Promise<void> {
  await supabase.from('product_variants').delete().eq('id', id);
}

export async function getVariantAttributes(variantId: string): Promise<{ attributeId: string; valueId: string }[]> {
  const { data } = await supabase
    .from('product_variant_attributes')
    .select('attribute_id, value_id')
    .eq('variant_id', variantId);
  return (data || []).map((d: any) => ({ attributeId: d.attribute_id, valueId: d.value_id }));
}

export async function setVariantAttributes(
  variantId: string,
  attributes: { attributeId: string; valueId: string }[]
): Promise<void> {
  await supabase.from('product_variant_attributes').delete().eq('variant_id', variantId);
  if (attributes.length === 0) return;
  const rows = attributes.map(a => ({
    variant_id: variantId, attribute_id: a.attributeId, value_id: a.valueId,
  }));
  const { error } = await supabase.from('product_variant_attributes').insert(rows);
  if (error) throw error;
}
