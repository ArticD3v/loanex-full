import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Colors, Fonts, Spacing, Radius, Shadow } from '../../constants/theme';

export default function LoginScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  async function handleSend() {
    if (phone.length < 10) { setError('Enter a valid 10-digit number'); return; }
    setError(''); setLoading(true);
    try {
      await login(phone);
      router.replace({ pathname: '/auth/otp', params: { phone, returnTo } });
    } catch { setError('Failed to send OTP. Try again.'); }
    finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="light" />
      <View style={styles.hero}>
        <Image source={{ uri: 'https://images.unsplash.com/photo-1483181957632-8bda974cbc91?w=800&q=80' }} style={styles.heroImg} contentFit="cover" transition={300} />
        <View style={styles.heroOverlay} />
        <View style={[styles.heroContent, { paddingTop: insets.top + Spacing.xl }]}>
          <View style={styles.logoBadge}><Text style={styles.logoText}>LoanEx</Text></View>
          <Text style={styles.heroTitle}>Shop Smart,{'\n'}Pay Smarter</Text>
          <Text style={styles.heroSub}>Premium products · Flexible EMI plans</Text>
        </View>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + Spacing.xl }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.formTitle}>Enter Mobile Number</Text>
        <Text style={styles.formSub}>We will send you a 4-digit verification code</Text>
        <View style={styles.phoneRow}>
          <View style={styles.code}><Text style={styles.codeText}>🇮🇳 +91</Text></View>
          <TextInput
            style={styles.phoneInput}
            placeholder="10-digit mobile number"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="phone-pad" maxLength={10}
            value={phone}
            onChangeText={t => { setPhone(t); setError(''); }}
          />
        </View>
        {!!error && <Text style={styles.errorText}>{error}</Text>}
        <Button title="Send OTP" onPress={handleSend} loading={loading} disabled={phone.length < 10} fullWidth size="lg" style={styles.sendBtn} />
        <View style={styles.hintBox}>
          <Text style={styles.hintTitle}>🔑 Dev Login</Text>
          <Text style={styles.hintSub}>Any phone + OTP: 1111 → Customer</Text>
        </View>
        <Text style={styles.terms}>
          By continuing you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text> &{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  hero: { height: 300, position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,15,35,0.65)' },
  heroContent: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: Spacing.xxl },
  logoBadge: { backgroundColor: Colors.primary, alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: Radius.sm, marginBottom: Spacing.lg },
  logoText: { color: '#fff', fontSize: Fonts.sm, fontWeight: Fonts.bold, letterSpacing: 2, textTransform: 'uppercase' },
  heroTitle: { fontSize: Fonts.display, fontWeight: Fonts.extraBold, color: '#fff', lineHeight: 40, marginBottom: Spacing.sm },
  heroSub: { fontSize: Fonts.md, color: 'rgba(255,255,255,0.75)' },
  scroll: { flex: 1 },
  form: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.xxl },
  formTitle: { fontSize: Fonts.xxl, fontWeight: Fonts.bold, color: Colors.textPrimary, marginBottom: 6 },
  formSub: { fontSize: Fonts.md, color: Colors.textSecondary, marginBottom: Spacing.xl },
  phoneRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  code: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingHorizontal: Spacing.md, justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  codeText: { fontSize: Fonts.md, color: Colors.textPrimary, fontWeight: Fonts.medium },
  phoneInput: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: Fonts.base, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  errorText: { color: Colors.error, fontSize: Fonts.sm, marginBottom: Spacing.md },
  sendBtn: { marginBottom: Spacing.xl, borderRadius: Radius.lg },
  hintBox: { backgroundColor: Colors.primaryLight, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.xl, borderWidth: 1, borderColor: '#F5D0B0' },
  hintTitle: { fontSize: Fonts.md, fontWeight: Fonts.semiBold, color: Colors.primary, marginBottom: 4 },
  hintSub: { fontSize: Fonts.sm, color: Colors.textSecondary, marginBottom: 6 },
  hintCode: { fontSize: Fonts.md, fontWeight: Fonts.semiBold, color: Colors.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  terms: { fontSize: Fonts.xs, color: Colors.textTertiary, textAlign: 'center' },
  termsLink: { color: Colors.primary, fontWeight: Fonts.medium },
});
