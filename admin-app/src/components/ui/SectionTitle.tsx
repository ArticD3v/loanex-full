import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface SectionTitleProps {
  title: string;
  style?: ViewStyle;
}

/** Blue section title with gold accent underline — detail screens */
export function SectionTitle({ title, style }: SectionTitleProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.goldLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textHeading,
    marginBottom: spacing.sm,
  },
  goldLine: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.goldLine,
  },
});
