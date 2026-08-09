import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { RootStackParamList } from '../../navigation/types';
import { getCodSettings, updateCodMaxAmount } from '../../services/settingsService';

type Props = NativeStackScreenProps<RootStackParamList, 'CodSettings'>;

export function CodSettingsScreen({ navigation }: Props) {
  const [current, setCurrent] = useState<{ codMaxAmount: number; source: 'db' | 'env' } | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const settings = await getCodSettings();
      setCurrent(settings);
      setDraft(String(settings.codMaxAmount));
    } catch (e: any) {
      setError(e?.message || 'Unable to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('SettingsHome');
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

  const handleSave = async () => {
    const parsed = Number(draft.replace(/[^\d]/g, ''));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Enter a valid non-negative amount.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await updateCodMaxAmount(parsed);
      setCurrent(updated);
      setDraft(String(updated.codMaxAmount));
      Alert.alert('Saved', 'COD limit updated. It applies to new checkouts immediately — no restart needed.');
    } catch (e: any) {
      setError(e?.message || 'Unable to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatted = (value: number) => `₹${value.toLocaleString('en-IN')}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : (
          <>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.errorTxt}>{error}</Text>
              </View>
            ) : null}

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Cash on Delivery limit</Text>
              <Text style={styles.cardDesc}>
                Orders above this amount cannot be paid on delivery — customers are shown the
                restriction and must pay online instead. The change takes effect immediately for
                new checkouts, without a backend restart.
              </Text>

              <View style={styles.currentRow}>
                <Text style={styles.currentLabel}>Current limit</Text>
                <Text style={styles.currentValue}>
                  {current ? formatted(current.codMaxAmount) : '—'}
                </Text>
              </View>
              {current?.source === 'db' ? (
                <Text style={styles.sourceBadge}>Custom (overrides default)</Text>
              ) : (
                <Text style={styles.sourceBadge}>Default (from backend env)</Text>
              )}

              <Text style={styles.inputLabel}>New limit (₹)</Text>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder="e.g. 50000"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />

              <Button
                title={saving ? 'Saving…' : 'Save limit'}
                onPress={handleSave}
                disabled={saving}
                style={{ marginTop: spacing.lg }}
              />
            </Card>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>How it works</Text>
              <Text style={styles.cardDesc}>
                • The cap is stored in the database (settings collection) and mirrors to Mongo, so
                it survives restarts and cold starts.{'\n'}
                • Customers on the website and the mobile app see the same limit — both derive it
                from the backend's checkout rules.{'\n'}
                • Setting it to 0 disables the cap entirely (COD allowed at any amount).
              </Text>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textHeading },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  card: { marginBottom: spacing.md },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textHeading, marginBottom: spacing.sm },
  cardDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  currentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
  },
  currentLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  currentValue: { fontSize: 18, fontWeight: '800', color: colors.primary },
  sourceBadge: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textHeading,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorTxt: { flex: 1, fontSize: 13, color: colors.danger },
});
