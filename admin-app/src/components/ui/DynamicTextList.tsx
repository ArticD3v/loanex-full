import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Input } from './Input';
import { Button } from './Button';
import { TextListItem } from '../../modules/products/types/product';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface DynamicTextListProps {
  title: string;
  addLabel: string;
  placeholder: string;
  items: TextListItem[];
  onChange: (items: TextListItem[]) => void;
}

export function DynamicTextList({ title, addLabel, placeholder, items, onChange }: DynamicTextListProps) {
  const safeItems = Array.isArray(items) ? items : [];

  const addItem = () => {
    onChange([...safeItems, { id: Date.now().toString(), value: '' }]);
  };

  const updateItem = (id: string, value: string) => {
    onChange(safeItems.map((item) => (item.id === id ? { ...item, value } : item)));
  };

  const removeItem = (id: string) => {
    onChange(safeItems.filter((item) => item.id !== id));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Button title={addLabel} onPress={addItem} size="sm" variant="outline" />
      </View>

      {safeItems.length === 0 ? (
        <Text style={styles.empty}>No items added yet</Text>
      ) : (
        safeItems.map((item, index) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.index}>{index + 1}.</Text>
            <Input
              placeholder={placeholder}
              value={item.value}
              onChangeText={(v) => updateItem(item.id, v)}
              style={styles.input}
            />
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
  index: { fontSize: 13, color: colors.textMuted, marginTop: 14, width: 22 },
  input: { flex: 1, marginBottom: 0 },
  removeBtn: { padding: spacing.sm, marginTop: 6 },
  removeText: { fontSize: 16, color: colors.danger },
});
