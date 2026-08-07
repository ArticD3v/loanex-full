import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.goldLine} />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      marginBottom: spacing.lg,
      marginTop: spacing.sm,
    },
    title: {
      ...typography.h3,
      fontSize: 17,
      color: colors.textHeading,
      marginBottom: spacing.sm,
    },
    goldLine: {
      width: 32,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.goldLine,
    },
  });
}
