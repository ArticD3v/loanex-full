import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';

type Variant = 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

/**
 * Enterprise buttons.
 * Gold is never used as a button background — accent maps to primary.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  size = 'md',
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const resolved = variant === 'accent' ? 'primary' : variant;

  const variantStyles = {
    primary: { bg: colors.primary, text: colors.textOnPrimary, border: colors.primary },
    secondary: { bg: colors.surface, text: colors.primary, border: colors.primary },
    outline: { bg: colors.surface, text: colors.primary, border: colors.primary },
    ghost: { bg: 'transparent', text: colors.textSecondary, border: 'transparent' },
    danger: { bg: colors.dangerLight, text: colors.danger, border: colors.danger },
    success: { bg: colors.successLight, text: colors.success, border: colors.success },
  };

  const sizeStyles = {
    sm: { paddingV: spacing.sm, paddingH: spacing.md, fontSize: 13 },
    md: { paddingV: spacing.md, paddingH: spacing.lg, fontSize: 14 },
    lg: { paddingV: spacing.lg, paddingH: spacing.xl, fontSize: 15 },
  };

  const v = variantStyles[resolved as keyof typeof variantStyles];
  const s = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          paddingVertical: s.paddingV,
          paddingHorizontal: s.paddingH,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: v.text, fontSize: s.fontSize }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    minHeight: 44,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
