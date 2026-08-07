import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DetailRow } from '../../components/ui/DetailRow';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { RootStackParamList } from '../../navigation/types';

export interface LifecycleDetailRow {
  label: string;
  value: string;
}

interface EmiLifecycleDetailScreenProps {
  title: string;
  sectionTitle: string;
  rows: LifecycleDetailRow[];
}

function formatMaybeDate(value: string) {
  if (!value || value === '—') return value;
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (/T\d{2}:\d{2}/.test(value) || value.includes(' ')) {
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function EmiLifecycleDetailScreen({
  title,
  sectionTitle,
  rows,
}: EmiLifecycleDetailScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Dashboard');
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card style={styles.section}>
          <SectionTitle title={sectionTitle} />
          {rows.map((row, index) => (
            <DetailRow
              key={`${row.label}-${index}`}
              label={row.label}
              value={formatMaybeDate(row.value)}
              isLast={index === rows.length - 1}
            />
          ))}
        </Card>
        <Text style={styles.placeholderNote}>
          Read-only placeholder screen. No APIs or business logic configured.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Back" variant="outline" onPress={handleGoBack} style={styles.footerBtn} />
      </View>
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
  scroll: { padding: spacing.lg, paddingBottom: spacing.lg },
  section: { marginBottom: spacing.md },
  placeholderNote: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerBtn: { width: '100%' },
});
