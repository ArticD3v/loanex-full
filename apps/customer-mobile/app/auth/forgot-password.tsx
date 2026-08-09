import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Colors, Fonts, Spacing, Radius } from '../../constants/theme';

export default function ForgotPasswordScreen() {
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { forgotPassword } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  async function handleSend() {
    const clean = mobile.replace(/\D/g, '');
    if (clean.length < 10) { setError('Enter your registered 10-digit mobile number'); return; }
    setError(''); setLoading(true);
    try {
      const res = await forgotPassword(clean);
      if (!res.success) { setError(res.error || 'Failed to send OTP.'); return; }
      router.replace({
        pathname: '/auth/otp',
        params: { phone: clean, purpose: 'FORGOT_PASSWORD' },
      } as any);
    } catch { setError('Failed to send OTP. Try again.'); }
    finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Forgot Password</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="lock-reset" size={44} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>
          Enter your registered mobile number. We will send a 6-digit OTP to verify it's you.
        </Text>

        <View style={styles.phoneRow}>
          <View style={styles.code}><Text style={styles.codeText}>🇮🇳 +91</Text></View>
          <TextInput
            style={styles.phoneInput}
            placeholder="10-digit mobile number"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="phone-pad" maxLength={10}
            value={mobile}
            onChangeText={t => { setMobile(t); setError(''); }}
          />
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Button title="Send OTP" onPress={handleSend} loading={loading} disabled={mobile.replace(/\D/g, '').length < 10} fullWidth size="lg" style={styles.sendBtn} />
        <Pressable style={styles.loginLink} onPress={() => router.replace('/auth/login' as any)}>
          <Text style={styles.loginLinkTxt}>Back to Login</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary },
  content: { flex: 1, paddingHorizontal: Spacing.xxl, paddingTop: Spacing.xxl },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  title: { fontSize: Fonts.xxl, fontWeight: Fonts.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  subtitle: { fontSize: Fonts.md, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.xl },
  phoneRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  code: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingHorizontal: Spacing.md, justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  codeText: { fontSize: Fonts.md, color: Colors.textPrimary, fontWeight: Fonts.medium },
  phoneInput: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: Fonts.base, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  errorText: { color: Colors.error, fontSize: Fonts.sm, marginBottom: Spacing.md },
  sendBtn: { borderRadius: Radius.lg, marginBottom: Spacing.xl },
  loginLink: { alignItems: 'center', padding: Spacing.md },
  loginLinkTxt: { color: Colors.primary, fontSize: Fonts.md, fontWeight: Fonts.medium },
});
