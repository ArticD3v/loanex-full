import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Pressable, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Colors, Fonts, Spacing, Radius } from '../../constants/theme';

export default function ResetPasswordScreen() {
  const { phone, otp } = useLocalSearchParams<{ phone: string, otp?: string }>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { resetPassword } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function passwordOk(pwd: string) {
    return (
      pwd.length >= 8 &&
      /[A-Z]/.test(pwd) &&
      /[a-z]/.test(pwd) &&
      /[0-9]/.test(pwd)
    );
  }

  async function handleReset() {
    if (!newPassword) { setError('Enter a new password'); return; }
    if (!passwordOk(newPassword)) {
      setError('Password must be 8+ chars with uppercase, lowercase and a number.');
      return;
    }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setError(''); setLoading(true);
    try {
      const res = await resetPassword(phone, otp || '', newPassword);
      if (!res.success) { setError(res.error || 'Unable to reset password.'); return; }
      Alert.alert(
        'Password Reset',
        'Your password has been reset. Please log in with your new password.',
        [{ text: 'Go to Login', onPress: () => router.replace('/auth/login' as any) }],
      );
    } catch { setError('Reset failed. Try again.'); }
    finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Reset Password</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="password" size={44} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.subtitle}>
          For <Text style={styles.phoneHL}>+91 {phone}</Text>. Use at least 8 characters with an uppercase letter, lowercase letter and a number.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="New password"
          placeholderTextColor={Colors.textTertiary}
          secureTextEntry
          value={newPassword}
          onChangeText={t => { setNewPassword(t); setError(''); }}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          placeholderTextColor={Colors.textTertiary}
          secureTextEntry
          value={confirmPassword}
          onChangeText={t => { setConfirmPassword(t); setError(''); }}
        />

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Button title="Reset Password" onPress={handleReset} loading={loading} disabled={!newPassword || !confirmPassword} fullWidth size="lg" style={styles.resetBtn} />
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
  phoneHL: { fontWeight: Fonts.semiBold, color: Colors.textPrimary },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: Fonts.base, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md },
  errorText: { color: Colors.error, fontSize: Fonts.sm, marginBottom: Spacing.md },
  resetBtn: { borderRadius: Radius.lg },
});
