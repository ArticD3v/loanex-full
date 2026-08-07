import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radius, shadow, spacing } from '../../theme/spacing';

interface DropdownProps {
  label?: string;
  placeholder?: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  error?: string;
  searchable?: boolean;
}

export function Dropdown({
  label,
  placeholder = 'Select...',
  value,
  options,
  onSelect,
  error,
}: DropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.trigger, error && styles.triggerError]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}

      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={[styles.menu, shadow.lg]}>
            <Text style={styles.menuTitle}>{label || 'Select option'}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, value === item && styles.optionSelected]}
                  onPress={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, value === item && styles.optionTextSelected]}>
                    {item}
                  </Text>
                  {value === item && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg, width: '100%', minWidth: 0 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    minHeight: 48,
    width: '100%',
  },
  triggerError: { borderColor: colors.danger },
  value: { fontSize: 15, color: colors.text, flex: 1 },
  placeholder: { color: colors.textMuted },
  chevron: { fontSize: 12, color: colors.textMuted },
  error: { fontSize: 12, color: colors.danger, marginTop: spacing.xs },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    maxHeight: 360,
    overflow: 'hidden',
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  optionSelected: { backgroundColor: colors.primaryLight },
  optionText: { fontSize: 15, color: colors.text },
  optionTextSelected: { color: colors.primary, fontWeight: '600' },
  check: { color: colors.primary, fontWeight: '700' },
});
