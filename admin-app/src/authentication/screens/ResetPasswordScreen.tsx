import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { LogoHeader } from '../components/LogoHeader';
import { PasswordInput } from '../components/PasswordInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { authColors } from '../../theme/colors';
import { authCardStyle, radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({ navigation }: Props) {
  const styles = useMemo(() => createStyles(), []);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleReset = () => {
    if (!newPassword.trim()) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      }),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={authColors.textOnDark} />
          </TouchableOpacity>

          <LogoHeader subtitle="Set New Password" size="compact" onDark />

          <View style={styles.card}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.description}>
              Create a strong new password for your admin account.
            </Text>

            <PasswordInput
              label="New Password"
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (error) setError('');
              }}
              placeholder="Enter new password"
            />

            <PasswordInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (error) setError('');
              }}
              placeholder="Re-enter new password"
            />

            {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

            <PrimaryButton title="Reset Password" onPress={handleReset} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles() {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: authColors.background,
    },
    flex: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.xxl,
    },
    backButton: {
      marginBottom: spacing.lg,
      alignSelf: 'flex-start',
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      backgroundColor: '#FFFFFF',
      padding: spacing.xxxl,
      marginTop: spacing.lg,
      ...authCardStyle,
    },
    title: {
      ...typography.h2,
      color: authColors.textHeading,
      marginBottom: spacing.sm,
    },
    description: {
      ...typography.bodySmall,
      color: authColors.textSecondary,
      marginBottom: spacing.xxl,
      lineHeight: 20,
    },
    errorBanner: {
      ...typography.bodySmall,
      color: authColors.danger,
      backgroundColor: authColors.dangerLight,
      padding: spacing.md,
      borderRadius: radius.sm,
      marginBottom: spacing.lg,
      textAlign: 'center',
    },
  });
}
