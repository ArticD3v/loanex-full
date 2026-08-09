import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Colors, Fonts, Spacing, Radius } from '../../constants/theme';

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function passwordOk(pwd: string) {
    return pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd);
  }

  async function handleRegister() {
    const clean = mobile.replace(/\D/g, '');
    if (fullName.trim().length < 2) { setError('Enter your full name'); return; }
    if (clean.length < 10) { setError('Enter a valid 10-digit mobile number'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address'); return; }
    if (!passwordOk(password)) {
      setError('Password must be 8+ chars with uppercase, lowercase and a number.');
      return;
    }
    setError(''); setLoading(true);
    try {
      const res = await register({ fullName: fullName.trim(), mobile: clean, email: email.trim(), password });
      if (!res.success) { setError(res.error || 'Registration failed.'); return; }
      router.replace({
        pathname: '/auth/otp',
        params: { phone: clean, purpose: 'REGISTER' },
      } as any);
    } catch { setError('Registration failed. Try again.'); }
    finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Create Account</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.iconWrap}>
          <MaterialIcons name="person-add" size={44} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Join LoanEx</Text>
        <Text style={styles.subtitle}>
          Create your account to shop and pay in easy EMIs. We'll verify your mobile with an OTP.
        </Text>

        <Text style={styles.fieldLabel}>Full Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Rahul Sharma"
          placeholderTextColor={Colors.textTertiary}
          value={fullName}
          onChangeText={t => { setFullName(t); setError(''); }}
        />

        <Text style={styles.fieldLabel}>Mobile Number *</Text>
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

        <Text style={styles.fieldLabel}>Email Address *</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="email-address" autoCapitalize="none"
          value={email}
          onChangeText={t => { setEmail(t); setError(''); }}
        />

        <Text style={styles.fieldLabel}>Password *</Text>
        <TextInput
          style={styles.input}
          placeholder="8+ chars, A-Z, a-z, 0-9"
          placeholderTextColor={Colors.textTertiary}
          secureTextEntry
          value={password}
          onChangeText={t => { setPassword(t); setError(''); }}
        />

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Button title="Create Account & Send OTP" onPress={handleRegister} loading={loading} fullWidth size="lg" style={styles.signupBtn} />

        <Pressable style={styles.loginLink} onPress={() => router.replace('/auth/login' as any)}>
          <Text style={styles.loginLinkTxt}>Already have an account? <Text style={styles.loginLinkBold}>Login</Text></Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: Fonts.lg, fontWeight: Fonts.bold, color: Colors.textPrimary },
  content: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  title: { fontSize: Fonts.xxl, fontWeight: Fonts.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  subtitle: { fontSize: Fonts.md, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.xl },
  fieldLabel: { fontSize: Fonts.xs, color: Colors.textTertiary, fontWeight: Fonts.medium, marginBottom: 4, marginTop: 6 },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: Fonts.base, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  phoneRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  code: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingHorizontal: Spacing.md, justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  codeText: { fontSize: Fonts.md, color: Colors.textPrimary, fontWeight: Fonts.medium },
  phoneInput: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: Fonts.base, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  errorText: { color: Colors.error, fontSize: Fonts.sm, marginBottom: Spacing.md },
  signupBtn: { borderRadius: Radius.lg, marginBottom: Spacing.lg },
  loginLink: { alignItems: 'center', padding: Spacing.md },
  loginLinkTxt: { color: Colors.textSecondary, fontSize: Fonts.md },
  loginLinkBold: { color: Colors.primary, fontWeight: Fonts.semiBold },
});
