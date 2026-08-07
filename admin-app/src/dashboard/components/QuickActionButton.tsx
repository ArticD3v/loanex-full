import React, { useMemo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { radius, shadow, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface QuickActionButtonProps {
  title: string;
  icon: string;
  onPress: () => void;
}

export function QuickActionButton({ title, icon, onPress }: QuickActionButtonProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={22} color={colors.primary} />
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    button: {
      width: '23%',
      minWidth: 72,
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
      ...shadow.sm,
    },
    title: {
      ...typography.caption,
      color: colors.textHeading,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
}
