import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Customer } from '../../types/customer';
import { Card } from '../../components/ui/Card';
import { colors } from '../../theme/colors';
import { ActivityIndicator } from 'react-native';
import { radius, spacing } from '../../theme/spacing';
import { RootStackParamList } from '../../navigation/types';

interface CustomerDetailViewProps {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  screenTitle: string;
  customer: Customer | undefined;
  loading?: boolean;
}

function formatLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function CustomerDetailView({ navigation, screenTitle, customer, loading }: CustomerDetailViewProps) {
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{screenTitle}</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.notFound}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.notFoundText}>Loading customer details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!customer) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{screenTitle}</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Customer not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{screenTitle}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <View style={styles.photoPlaceholder}>
            <Ionicons name="person-outline" size={48} color={colors.textMuted} />
          </View>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerId}>ID: {customer.id}</Text>
        </View>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <DetailRow label="Mobile Number" value={customer.mobile} />
          <DetailRow label="City" value={customer.city} />
          <DetailRow label="Customer Status" value={formatLabel(customer.status)} />
          <DetailRow label="Current EMI Status" value={formatLabel(customer.emiStatus)} isLast />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.detailRow, isLast && styles.detailRowLast]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
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
  title: { fontSize: 18, fontWeight: '700', color: colors.textHeading },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  profileSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  photoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  customerName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textHeading,
    textAlign: 'center',
  },
  customerId: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: { marginTop: spacing.sm },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: { fontSize: 14, color: colors.textSecondary, flex: 1 },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: colors.textSecondary },
});
