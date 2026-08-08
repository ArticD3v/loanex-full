import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Order, PAYMENT_TYPE_LABEL } from '../../types/order';
import { Card } from '../../components/ui/Card';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { RootStackParamList } from '../../navigation/types';

interface OrderDetailViewProps {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  screenTitle: string;
  order: Order | undefined;
}

function formatLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatAmount(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function OrderDetailView({ navigation, screenTitle, order }: OrderDetailViewProps) {
  if (!order) {
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
          <Text style={styles.notFoundText}>Order not found</Text>
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
        <View style={styles.productSection}>
          {order.productImageUrl ? (
            <Image source={{ uri: order.productImageUrl }} style={styles.productImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
            </View>
          )}
          <Text style={styles.orderId}>{order.id}</Text>
          <Text style={styles.productName}>{order.productName}</Text>
        </View>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <DetailRow label="Customer Name" value={order.customerName} />
          <DetailRow label="Mobile Number" value={order.customerMobile} />
          <DetailRow label="Order Date" value={formatDate(order.orderDate)} />
          <DetailRow label="Order Amount" value={formatAmount(order.orderAmount)} />
          <DetailRow label="Payment Type" value={PAYMENT_TYPE_LABEL[order.paymentType]} />
          <DetailRow label="Order Status" value={formatLabel(order.status)} isLast />
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
  productSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  productImage: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    resizeMode: 'cover',
    marginBottom: spacing.md,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  orderId: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  productName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textHeading,
    textAlign: 'center',
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
