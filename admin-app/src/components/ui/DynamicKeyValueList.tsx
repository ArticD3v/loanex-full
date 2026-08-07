import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Input } from './Input';
import { Button } from './Button';
import { KeyValueItem } from '../../modules/products/types/product';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface DynamicKeyValueListProps {
  title: string;
  items: KeyValueItem[];
  onChange: (items: KeyValueItem[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function DynamicKeyValueList({
  title,
  items,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: DynamicKeyValueListProps) {
  const safeItems = Array.isArray(items) ? items : [];

  const addItem = () => {
    onChange([...safeItems, { id: Date.now().toString(), key: '', value: '' }]);
  };

  const updateItem = (id: string, field: 'key' | 'value', value: string) => {
    onChange(safeItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeItem = (id: string) => {
    onChange(safeItems.filter((item) => item.id !== id));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Button title="+ Add Specification" onPress={addItem} size="sm" variant="outline" />
      </View>

      {safeItems.length === 0 ? (
        <Text style={styles.empty}>No specifications added yet</Text>
      ) : (
        safeItems.map((item, index) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.index}>{index + 1}</Text>
            <View style={styles.fields}>
              <Input
                placeholder={keyPlaceholder}
                value={item.key}
                onChangeText={(v) => updateItem(item.id, 'key', v)}
                style={styles.fieldInput}
              />
              <Input
                placeholder={valuePlaceholder}
                value={item.value}
                onChangeText={(v) => updateItem(item.id, 'value', v)}
                style={styles.fieldInput}
              />
            </View>
            <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeBtn}>
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: { fontSize: 14, fontWeight: '700', color: colors.text },
  empty: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  index: { fontSize: 12, color: colors.textMuted, marginTop: 14, width: 18 },
  fields: { flex: 1, gap: spacing.sm },
  fieldInput: { marginBottom: 0, minHeight: 44 },
  removeBtn: { padding: spacing.sm, marginTop: 6 },
  removeText: { fontSize: 16, color: colors.danger },
});
