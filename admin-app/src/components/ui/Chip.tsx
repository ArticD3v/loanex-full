import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  color?: string;
}

export function Chip({ label, selected, onPress, onRemove, color }: ChipProps) {
  const bg = selected ? colors.primaryLight : colors.surface;
  const textColor = selected ? colors.primary : colors.textSecondary;
  const borderColor = selected ? colors.accent : colors.border;

  const content = (
    <View style={[styles.chip, { backgroundColor: color || bg, borderColor: color ? color : borderColor }]}>
      <Text style={[styles.label, { color: color ? '#FFF' : textColor }]}>{label}</Text>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.remove, { color: color ? '#FFF' : colors.textMuted }]}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  }
  return content;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  remove: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 2,
  },
});
