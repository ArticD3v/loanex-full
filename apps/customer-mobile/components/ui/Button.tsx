import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { Colors, Fonts, Spacing, Radius } from '../../constants/theme';

interface ButtonProps {
  onPress: () => void; title: string;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg'; loading?: boolean; disabled?: boolean;
  fullWidth?: boolean; style?: ViewStyle;
}

export function Button({ onPress, title, variant = 'primary', size = 'md', loading, disabled, fullWidth, style }: ButtonProps) {
  const isDisabled = disabled || loading;
  const bgMap = { primary: Colors.primary, outline: 'transparent', ghost: 'transparent', danger: Colors.error, success: Colors.success };
  const textMap = { primary: Colors.textInverse, outline: Colors.primary, ghost: Colors.primary, danger: Colors.textInverse, success: Colors.textInverse };
  const padMap = { sm: { px: Spacing.md, py: Spacing.xs + 2 }, md: { px: Spacing.xl, py: Spacing.md }, lg: { px: Spacing.xxl, py: Spacing.lg - 1 } };
  const fontMap = { sm: Fonts.sm, md: Fonts.md, lg: Fonts.base };
  const p = padMap[size];
  return (
    <Pressable
      onPress={onPress} disabled={isDisabled} accessibilityLabel={title}
      style={({ pressed }) => [{
        backgroundColor: bgMap[variant], borderRadius: Radius.md,
        paddingHorizontal: p.px, paddingVertical: p.py,
        alignItems: 'center' as const, justifyContent: 'center' as const,
        borderWidth: variant === 'outline' ? 1.5 : 0, borderColor: Colors.primary,
        width: fullWidth ? '100%' : undefined,
        opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
      }, style]}
    >
      {loading ? (
        <ActivityIndicator color={textMap[variant]} size="small" />
      ) : (
        <Text style={{ color: textMap[variant], fontSize: fontMap[size], fontWeight: Fonts.semiBold }}>{title}</Text>
      )}
    </Pressable>
  );
}
