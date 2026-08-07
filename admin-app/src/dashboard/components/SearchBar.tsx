import React, { useMemo } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { radius, shadow, spacing } from '../../theme/spacing';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export function SearchBar({ value, onChangeText }: SearchBarProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={20} color={colors.textMuted} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Search products, customers, orders..."
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 ? (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      minHeight: 48,
      ...shadow.sm,
    },
    icon: {
      marginRight: spacing.sm,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      paddingVertical: spacing.md,
    },
  });
}
