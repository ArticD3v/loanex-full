import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Chip } from '../../components/ui/Chip';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface MultiSelectChipsProps {
  label?: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  emptyHint?: string;
}

/** Toggle chips for multi-select (e.g. Delivery Partner → Serviceable Zones). */
export function MultiSelectChips({
  label,
  options,
  value,
  onChange,
  emptyHint = 'No options available',
}: MultiSelectChipsProps) {
  const toggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {options.length === 0 ? (
        <Text style={styles.empty}>{emptyHint}</Text>
      ) : (
        <View style={styles.wrap}>
          {options.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={value.includes(option)}
              onPress={() => toggle(option)}
            />
          ))}
        </View>
      )}
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChange([])} style={styles.clearBtn}>
          <Text style={styles.clearText}>Clear selection</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  empty: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  clearBtn: { marginTop: spacing.sm },
  clearText: { fontSize: 13, fontWeight: '600', color: colors.secondary },
});
