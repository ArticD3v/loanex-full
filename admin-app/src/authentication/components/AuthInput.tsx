import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { authColors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function AuthInput({ label, error, style, ...props }: AuthInputProps) {
  const [focused, setFocused] = useState(false);
  const styles = useMemo(() => createStyles(), []);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
          error ? styles.inputError : undefined,
          style,
        ]}
        placeholderTextColor={authColors.textMuted}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: {
      marginBottom: spacing.lg,
    },
    label: {
      ...typography.label,
      color: authColors.text,
      marginBottom: spacing.sm,
    },
    input: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: authColors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md + 2,
      fontSize: 15,
      color: authColors.text,
      minHeight: 52,
    },
    inputFocused: {
      borderColor: authColors.primary,
      borderWidth: 1.5,
      backgroundColor: '#FFFFFF',
    },
    inputError: {
      borderColor: authColors.danger,
    },
    error: {
      ...typography.caption,
      color: authColors.danger,
      marginTop: spacing.xs,
    },
  });
}
