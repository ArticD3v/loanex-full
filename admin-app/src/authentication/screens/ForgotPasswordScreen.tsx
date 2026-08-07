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
import { RootStackParamList } from '../../navigation/types';
import { LogoHeader } from '../components/LogoHeader';
import { AuthInput } from '../components/AuthInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { authColors } from '../../theme/colors';
import { authCardStyle, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const styles = useMemo(() => createStyles(), []);
  const [email, setEmail] = useState('');

  const handleSendOtp = () => {
    navigation.navigate('OtpVerification');
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

          <LogoHeader subtitle="Password Recovery" size="compact" onDark />

          <View style={styles.card}>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.description}>
              Enter your registered email or mobile number to receive an OTP.
            </Text>

            <AuthInput
              label="Email / Mobile"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email or mobile number"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <PrimaryButton title="Send OTP" onPress={handleSendOtp} />
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
  });
}
