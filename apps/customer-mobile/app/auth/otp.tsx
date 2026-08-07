import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Colors, Fonts, Spacing, Radius } from '../../constants/theme';

const OTP_LEN = 4;

export default function OTPScreen() {
  const { phone, returnTo } = useLocalSearchParams<{ phone: string, returnTo?: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(30);
  const { verifyOTP } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const t = setInterval(() => setTimer(s => s > 0 ? s - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);

  async function handleVerify() {
    if (otp.length < OTP_LEN) { setError('Enter the complete 4-digit OTP'); return; }
    setError(''); setLoading(true);
    try {
      const res = await verifyOTP(phone, otp);
      if (res.user) {
        if (returnTo) router.replace(returnTo as any);
        else if (res.user.role === 'admin') router.replace('/admin');
        else router.replace('/(tabs)');
      } else { setError(res.error || 'Invalid OTP'); setOtp(''); }
    } catch { setError('Verification failed. Try again.'); }
    finally { setLoading(false); }
  }

  const digits = otp.split('');
  return (
    <KeyboardAvoidingView style={[styles.container, { paddingBottom: insets.bottom }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
      </View>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="verified" size={48} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>Enter the code sent to{'\n'}<Text style={styles.phoneHL}>+91 {phone}</Text></Text>
        <Pressable onPress={() => inputRef.current?.focus()} style={styles.otpRow}>
          {Array.from({ length: OTP_LEN }).map((_, i) => (
            <View key={i} style={[styles.box, otp.length === i && styles.boxActive, otp.length > i && styles.boxFilled, !!error && styles.boxError]}>
              <Text style={styles.digit}>{digits[i] || ''}</Text>
            </View>
          ))}
        </Pressable>
        <TextInput ref={inputRef} value={otp} onChangeText={t => { setOtp(t.replace(/\D/g, '').slice(0, OTP_LEN)); setError(''); }} keyboardType="number-pad" maxLength={OTP_LEN} style={styles.hiddenInput} autoFocus />
        {!!error && (
          <View style={styles.errorRow}>
            <MaterialIcons name="error-outline" size={16} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        <Button title="Verify OTP" onPress={handleVerify} loading={loading} disabled={otp.length < OTP_LEN} fullWidth size="lg" style={styles.verifyBtn} />
        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Did not receive? </Text>
          {timer > 0 ? <Text style={styles.timerText}>Resend in {timer}s</Text> : (
            <Pressable onPress={() => setTimer(30)}><Text style={styles.resendLink}>Resend OTP</Text></Pressable>
          )}
        </View>
        <View style={styles.hintBox}>
          <Text style={styles.hintTitle}>Dev: No real SMS</Text>
          <Text style={styles.hintCode}>{"0000  →  Admin"}</Text>
          <Text style={styles.hintCode}>{"1111  →  Customer"}</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, paddingHorizontal: Spacing.xxl, alignItems: 'center' },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, marginTop: Spacing.lg },
  title: { fontSize: Fonts.xxl, fontWeight: Fonts.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  subtitle: { fontSize: Fonts.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: Spacing.xxxl },
  phoneHL: { fontWeight: Fonts.semiBold, color: Colors.textPrimary },
  otpRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  box: { width: 62, height: 68, borderRadius: Radius.lg, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  boxActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  boxFilled: { borderColor: Colors.primary },
  boxError: { borderColor: Colors.error, backgroundColor: Colors.errorLight },
  digit: { fontSize: Fonts.xxxl, fontWeight: Fonts.bold, color: Colors.textPrimary },
  hiddenInput: { position: 'absolute', opacity: 0, width: 0, height: 0 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.md },
  errorText: { color: Colors.error, fontSize: Fonts.sm },
  verifyBtn: { borderRadius: Radius.lg, marginBottom: Spacing.xl, width: '100%' },
  resendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xxl },
  resendText: { fontSize: Fonts.md, color: Colors.textSecondary },
  timerText: { fontSize: Fonts.md, color: Colors.textTertiary },
  resendLink: { fontSize: Fonts.md, color: Colors.primary, fontWeight: Fonts.semiBold },
  hintBox: { backgroundColor: Colors.primaryLight, borderRadius: Radius.md, padding: Spacing.lg, width: '100%', borderWidth: 1, borderColor: '#F5D0B0' },
  hintTitle: { fontSize: Fonts.sm, fontWeight: Fonts.semiBold, color: Colors.primary, marginBottom: 6 },
  hintCode: { fontSize: Fonts.md, fontWeight: Fonts.semiBold, color: Colors.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
