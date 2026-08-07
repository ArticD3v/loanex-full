import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { spacing } from '../../theme/spacing';

interface DetailRowProps {
  label: string;
  value: string;
  isLast?: boolean;
}

export function DetailRow({ label, value, isLast }: DetailRowProps) {
  const colors = useTheme();

  return (
    <View
      style={[
        styles.detailRow,
        { borderBottomColor: colors.borderLight },
        isLast && styles.detailRowLast,
      ]}
    >
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
});
