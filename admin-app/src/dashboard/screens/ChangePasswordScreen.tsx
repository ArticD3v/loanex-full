import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PasswordInput } from '../../authentication/components/PasswordInput';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { STATIC_CREDENTIALS } from '../../authentication/constants';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'ChangePassword'>;

export function ChangePasswordScreen({ navigation }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Dashboard');
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleGoBack();
        return true;
      });
      return () => subscription.remove();
    }, [handleGoBack]),
  );

  const clearError = () => {
    if (error) setError('');
  };

  const handleSubmit = () => {
    if (!currentPassword.trim()) {
      setError('Please enter your current password.');
      return;
    }
    if (currentPassword !== STATIC_CREDENTIALS.password) {
      setError('Current password is incorrect.');
      return;
    }
    if (!newPassword.trim()) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setError('');
    Alert.alert('Password Updated', 'Your password has been changed (UI only).', [
      { text: 'OK', onPress: handleGoBack },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Card style={styles.card}>
            <SectionTitle title="Update Password" />
            <Text style={styles.description}>
              Enter your current password and choose a new one. Changes are UI only.
            </Text>

            <PasswordInput
              label="Current Password"
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text);
                clearError();
              }}
              placeholder="Enter current password"
            />

            <PasswordInput
              label="New Password"
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                clearError();
              }}
              placeholder="Enter new password"
            />

            <PasswordInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                clearError();
              }}
              placeholder="Re-enter new password"
            />

            {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

            <Button title="Update Password" onPress={handleSubmit} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 3,
      borderBottomColor: colors.accent,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      ...typography.label,
      fontSize: 16,
      color: colors.textHeading,
    },
    scroll: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    card: {
      marginBottom: spacing.md,
    },
    description: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
      lineHeight: 20,
    },
    errorBanner: {
      ...typography.bodySmall,
      color: colors.danger,
      backgroundColor: colors.dangerLight,
      padding: spacing.md,
      borderRadius: radius.sm,
      marginBottom: spacing.lg,
      textAlign: 'center',
    },
  });
}
