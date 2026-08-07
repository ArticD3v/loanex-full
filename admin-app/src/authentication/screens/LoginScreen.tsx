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
import { RootStackParamList } from '../../navigation/types';
import { LogoHeader } from '../components/LogoHeader';
import { AuthInput } from '../components/AuthInput';
import { PasswordInput } from '../components/PasswordInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { STATIC_CREDENTIALS } from '../constants';
import { getUsers } from '../../users/data/userStore';
import { authColors } from '../../theme/colors';
import { authCardStyle, radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

function matchesUserLogin(identifier: string, password: string) {
  const normalized = identifier.trim().toLowerCase();
  const digits = identifier.replace(/\D/g, '');

  return getUsers().find((user) => {
    if (!user.password || user.password !== password) return false;
    if (user.status !== 'active' || user.blocked) return false;

    const emailMatch = user.email.toLowerCase() === normalized;
    const mobileDigits = user.mobile.replace(/\D/g, '');
    const mobileMatch =
      digits.length >= 10 && mobileDigits.endsWith(digits.slice(-10));

    return emailMatch || mobileMatch;
  });
}

export function LoginScreen({ navigation }: Props) {
  const styles = useMemo(() => createStyles(), []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter both Email/Mobile and Password');
      return;
    }

    try {
      // In development, the backend uses OTP for admin login.
      // We pass the "Password" field value as the "OTP".
      const { loginAsAdmin } = require('../../services/authService');
      await loginAsAdmin(trimmedEmail, password);
      
      setError('');
      navigation.replace('Dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid Credentials');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.navyShell}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <LogoHeader subtitle="Enterprise Admin Portal" size="login" onDark />
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Sign In</Text>
              <Text style={styles.description}>
                Secure access to your LoanEx administration console.
              </Text>

              <AuthInput
                label="Email / Mobile Number"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError('');
                }}
                placeholder="admin@loanex.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <PasswordInput
                label="Password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError('');
                }}
                placeholder="Enter your password"
              />

              <TouchableOpacity
                style={styles.forgotLink}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles.forgotText}>Forgot Password</Text>
              </TouchableOpacity>

              {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

              <PrimaryButton title="Login" onPress={handleLogin} />
            </View>

            <Text style={styles.footerNote}>Trusted lending operations platform</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

function createStyles() {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: authColors.background,
    },
    navyShell: {
      flex: 1,
      backgroundColor: authColors.background,
    },
    flex: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.huge,
      justifyContent: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    card: {
      backgroundColor: '#FFFFFF',
      padding: spacing.xxl,
      ...authCardStyle,
    },
    title: {
      ...typography.h2,
      color: authColors.textHeading,
      marginBottom: spacing.xs,
    },
    description: {
      ...typography.bodySmall,
      color: authColors.textSecondary,
      marginBottom: spacing.xl,
      lineHeight: 20,
    },
    forgotLink: {
      alignSelf: 'flex-end',
      marginBottom: spacing.md,
      marginTop: -spacing.sm,
    },
    forgotText: {
      ...typography.bodySmall,
      color: authColors.primary,
      fontWeight: '600',
    },
    errorBanner: {
      ...typography.bodySmall,
      color: authColors.danger,
      backgroundColor: authColors.dangerLight,
      padding: spacing.md,
      borderRadius: radius.sm,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    footerNote: {
      ...typography.caption,
      color: authColors.textOnDarkMuted,
      textAlign: 'center',
      marginTop: spacing.lg,
      letterSpacing: 0.2,
    },
  });
}
