import React from 'react';
import { View, Text, StyleSheet, Switch as RNSwitch } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface ToggleSwitchProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function ToggleSwitch({ label, description, value, onValueChange }: ToggleSwitchProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textWrap}>
        <Text style={styles.label}>{label}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      <RNSwitch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primaryLight }}
        thumbColor={value ? colors.primary : colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  textWrap: { flex: 1, marginRight: spacing.lg },
  label: { fontSize: 15, fontWeight: '600', color: colors.text },
  description: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});
