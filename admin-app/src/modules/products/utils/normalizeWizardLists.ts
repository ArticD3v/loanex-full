import { KeyValueItem, TextListItem } from '../types/product';

function nextId(prefix: string, index: number): string {
  return `${prefix}-${Date.now()}-${index}`;
}

/** Coerce unknown values into a safe display/input string. */
export function normalizeString(raw: unknown, fallback = ''): string {
  if (raw == null) return fallback;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  if (Array.isArray(raw)) {
    return raw
      .map((item) => (typeof item === 'string' ? item : normalizeString(item)))
      .filter(Boolean)
      .join(', ');
  }
  return fallback;
}

/**
 * API may store colour/size as an object like
 * `{ color, storageOrSize, price, stock, image }`.
 */
export function normalizeColourSizeVariant(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const parts = [obj.color, obj.storageOrSize, obj.size, obj.variant, obj.label]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean);
    if (parts.length > 0) return parts.join(' / ');
  }
  return normalizeString(raw);
}

/** Coerce API/wizard JSON into KeyValueItem[] for DynamicKeyValueList. */
export function normalizeKeyValueItems(raw: unknown): KeyValueItem[] {
  if (raw == null) return [];

  if (Array.isArray(raw)) {
    return raw.map((item, index) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const row = item as Record<string, unknown>;
        return {
          id: String(row.id ?? nextId('spec', index)),
          key: String(row.key ?? row.name ?? row.label ?? ''),
          value: String(row.value ?? ''),
        };
      }
      return { id: nextId('spec', index), key: '', value: String(item ?? '') };
    });
  }

  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;

    if (Array.isArray(obj.rows)) {
      return normalizeKeyValueItems(obj.rows);
    }

    return Object.entries(obj)
      .filter(([key]) => key !== 'keySpecs' && key !== 'rows')
      .map(([key, value], index) => ({
        id: nextId('spec', index),
        key,
        value:
          value == null
            ? ''
            : typeof value === 'object'
              ? JSON.stringify(value)
              : String(value),
      }));
  }

  return [];
}

/** Coerce API/wizard JSON into TextListItem[] for DynamicTextList. */
export function normalizeTextListItems(raw: unknown): TextListItem[] {
  if (raw == null) return [];

  if (Array.isArray(raw)) {
    return raw.map((item, index) => {
      if (typeof item === 'string') {
        return { id: nextId('text', index), value: item };
      }
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const row = item as Record<string, unknown>;
        return {
          id: String(row.id ?? nextId('text', index)),
          value: String(row.value ?? row.text ?? row.label ?? ''),
        };
      }
      return { id: nextId('text', index), value: String(item ?? '') };
    });
  }

  if (typeof raw === 'string' && raw.trim()) {
    return [{ id: nextId('text', 0), value: raw }];
  }

  return [];
}
