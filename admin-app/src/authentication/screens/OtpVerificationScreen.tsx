import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { LogoHeader } from '../components/LogoHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { STATIC_CREDENTIALS } from '../constants';
import { authColors } from '../../theme/colors';
import { authCardStyle, radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'OtpVerification'>;

const OTP_LENGTH = 6;

export function OtpVerificationScreen({ navigation }: Props) {
  const styles = useMemo(() => createStyles(), []);

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const updated = [...otp];
    updated[index] = digit;
    setOtp(updated);
    if (error) setError('');

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const code = otp.join('');
    if (code === STATIC_CREDENTIALS.otp) {
      setError('');
      navigation.navigate('ResetPassword');
      return;
    }
    setError('Invalid OTP.');
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

          <LogoHeader subtitle="Verify OTP" size="compact" onDark />

          <View style={styles.card}>
            <Text style={styles.title}>OTP Verification</Text>
            <Text style={styles.description}>
              Enter the 6-digit OTP sent to your registered contact.
            </Text>

            <View style={styles.otpRow}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  style={[styles.otpInput, digit ? styles.otpInputFilled : undefined]}
                  value={digit}
                  onChangeText={(text) => handleChange(text, index)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(nativeEvent.key, index)
                  }
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

            <PrimaryButton title="Verify" onPress={handleVerify} />
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
    otpRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.xxl,
      gap: spacing.sm,
    },
    otpInput: {
      flex: 1,
      aspectRatio: 1,
      maxWidth: 48,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: authColors.border,
      borderRadius: radius.md,
      fontSize: 20,
      fontWeight: '600',
      color: authColors.text,
      textAlign: 'center',
    },
    otpInputFilled: {
      borderColor: authColors.primary,
      borderWidth: 1.5,
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
