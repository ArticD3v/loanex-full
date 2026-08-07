import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, Spacing, Radius } from '../../constants/theme';

type Variant = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'neutral' | 'emi';
const CONFIGS: Record<Variant, { bg: string; text: string }> = {
  success: { bg: Colors.successLight, text: Colors.success },
  warning: { bg: Colors.warningLight, text: '#B45309' },
  error: { bg: Colors.errorLight, text: Colors.error },
  info: { bg: '#EFF6FF', text: '#2563EB' },
  primary: { bg: Colors.primaryLight, text: Colors.primary },
  neutral: { bg: Colors.surfaceAlt, text: Colors.textSecondary },
  emi: { bg: Colors.successLight, text: Colors.success },
};

export function Badge({ label, variant = 'neutral' }: { label: string; variant?: Variant }) {
  const c = CONFIGS[variant];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full, alignSelf: 'flex-start' },
  text: { fontSize: Fonts.xs, fontWeight: Fonts.semiBold, letterSpacing: 0.3 },
});
