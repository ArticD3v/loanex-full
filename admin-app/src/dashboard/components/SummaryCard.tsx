import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { radius, shadow, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface SummaryCardProps {
  title: string;
  value: string;
  icon: string;
}

export function SummaryCard({ title, value, icon }: SummaryCardProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.primary} />
        </View>
        <View style={styles.goldDot} />
      </View>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: {
      width: '48%',
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadow.sm,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    goldDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
    value: {
      ...typography.h3,
      fontSize: 18,
      color: colors.textHeading,
      marginBottom: spacing.xs,
    },
    title: {
      ...typography.caption,
      color: colors.textSecondary,
      lineHeight: 16,
    },
  });
}
