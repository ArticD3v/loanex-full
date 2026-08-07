import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authColors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label: string;
  error?: string;
}

export function PasswordInput({ label, error, style, ...props }: PasswordInputProps) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const styles = useMemo(() => createStyles(), []);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            focused && styles.inputFocused,
            error ? styles.inputError : undefined,
            style,
          ]}
          placeholderTextColor={authColors.textMuted}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
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
        <TouchableOpacity
          style={styles.toggle}
          onPress={() => setVisible((v) => !v)}
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={authColors.textSecondary}
          />
        </TouchableOpacity>
      </View>
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
    inputRow: {
      position: 'relative',
    },
    input: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: authColors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingRight: spacing.xxxl + spacing.sm,
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
    toggle: {
      position: 'absolute',
      right: spacing.lg,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
    },
    error: {
      ...typography.caption,
      color: authColors.danger,
      marginTop: spacing.xs,
    },
  });
}
