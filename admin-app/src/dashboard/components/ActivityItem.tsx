import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface ActivityItemProps {
  title: string;
  description: string;
  time: string;
  icon: string;
  isLast?: boolean;
}

export function ActivityItem({
  title,
  description,
  time,
  icon,
  isLast = false,
}: ActivityItemProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors, isLast), [colors, isLast]);

  return (
    <View style={styles.container}>
      <View style={styles.timeline}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color={colors.primary} />
        </View>
        {!isLast ? <View style={styles.line} /> : null}
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>, isLast: boolean) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      paddingBottom: isLast ? 0 : spacing.md,
    },
    timeline: {
      width: 36,
      alignItems: 'center',
      marginRight: spacing.md,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: radius.full,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    line: {
      width: 2,
      flex: 1,
      backgroundColor: colors.borderLight,
      marginTop: spacing.xs,
      minHeight: 20,
    },
    content: {
      flex: 1,
      paddingBottom: spacing.sm,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: colors.borderLight,
    },
    title: {
      ...typography.label,
      color: colors.textHeading,
      marginBottom: 2,
    },
    description: {
      ...typography.caption,
      color: colors.textSecondary,
      lineHeight: 16,
      marginBottom: spacing.xs,
    },
    time: {
      ...typography.caption,
      color: colors.textMuted,
      fontSize: 11,
    },
  });
}
