import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MasterStatus } from '../types/masterData';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';

export function MasterStatusBadge({ status }: { status: MasterStatus }) {
  const active = status === 'active';
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: active ? colors.successLight : colors.borderLight },
      ]}
    >
      <Text style={[styles.text, { color: active ? colors.success : colors.textSecondary }]}>
        {active ? 'Active' : 'Inactive'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
