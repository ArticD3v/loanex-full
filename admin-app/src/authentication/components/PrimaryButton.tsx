import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { authColors } from '../../theme/colors';
import { radius, shadow, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
}: PrimaryButtonProps) {
  const styles = useMemo(() => createStyles(), []);

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
    >
      {loading ? (
        <ActivityIndicator color={authColors.textOnPrimary} size="small" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

function createStyles() {
  return StyleSheet.create({
    button: {
      backgroundColor: authColors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
      ...shadow.md,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    text: {
      ...typography.button,
      color: authColors.textOnPrimary,
    },
  });
}
