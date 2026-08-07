import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { Colors, Fonts, Spacing, Radius, Shadow } from '../constants/theme';
import { api } from '../lib/apiClient';

interface EmiApplication {
  id: string;
  applicationNumber: string;
  productId: string;
  productName: string;
  status: string;
  sellingPrice: number;
  requestedDownPayment: number;
  requestedTenure: number;
  estimatedMonthlyEmi: number;
  approvedAmount: number | null;
  approvedTenure: number | null;
  approvedDownPayment: number | null;
  monthlyEmi: number | null;
  interestRate: number;
  processingFee: number;
  adminRemarks: string | null;
  rejectionReason: string | null;
  submittedAt: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  PENDING:                { label: 'Pending Review',        color: '#D97706', bg: '#FEF3C7', icon: 'hourglass-empty' },
  UNDER_REVIEW:           { label: 'Under Review',          color: '#2563EB', bg: '#DBEAFE', icon: 'manage-search' },
  APPROVED:               { label: 'Approved ✓',            color: '#16A34A', bg: '#DCFCE7', icon: 'check-circle' },
  REJECTED:               { label: 'Rejected',              color: '#DC2626', bg: '#FEE2E2', icon: 'cancel' },
  OFFER_ACCEPTED:         { label: 'Offer Accepted',        color: '#16A34A', bg: '#DCFCE7', icon: 'thumb-up' },
  DECLINED_BY_CUSTOMER:   { label: 'Declined',              color: '#6B7280', bg: '#F3F4F6', icon: 'thumb-down' },
  DOWN_PAYMENT_PENDING:   { label: 'Pay Down Payment',      color: '#7C3AED', bg: '#EDE9FE', icon: 'payment' },
  DOWN_PAYMENT_COMPLETED: { label: 'Down Payment Done',     color: '#16A34A', bg: '#DCFCE7', icon: 'paid' },
  ORDER_CONFIRMED:        { label: 'Order Confirmed',       color: '#16A34A', bg: '#DCFCE7', icon: 'local-shipping' },
  ACTIVE_EMI:             { label: 'EMI Active',            color: '#2563EB', bg: '#DBEAFE', icon: 'account-balance' },
};

export default function EMIScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [applications, setApplications] = useState<EmiApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchApplications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get(`/legacy/emi-applications?userId=${user.id}`);
      setApplications(res.data || []);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchApplications();
  }, [fetchApplications]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchApplications();
  };

  if (loading) return (
    <View style={[s.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );

  if (!user) return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}><Text style={s.headerTitle}>My EMIs</Text></View>
      <View style={s.emptyState}>
        <MaterialIcons name="lock-outline" size={48} color={Colors.border} />
        <Text style={s.emptyTitle}>Login Required</Text>
        <Text style={s.emptySub}>Please log in to view your EMI applications.</Text>
        <Pressable style={s.shopBtn} onPress={() => router.push('/auth/login' as any)}>
          <Text style={s.shopBtnTxt}>Login</Text>
        </Pressable>
      </View>
    </View>
  );

  if (applications.length === 0) return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}><Text style={s.headerTitle}>My EMIs</Text></View>
      <View style={s.emptyState}>
        <View style={s.emptyIcon}><MaterialIcons name="account-balance" size={40} color={Colors.primary} /></View>
        <Text style={s.emptyTitle}>No EMI Applications</Text>
        <Text style={s.emptySub}>Browse products and tap "Apply for EMI" to get started.</Text>
        <Pressable style={s.shopBtn} onPress={() => router.replace('/(tabs)' as any)}>
          <Text style={s.shopBtnTxt}>Browse Products</Text>
        </Pressable>
      </View>
    </View>
  );

  const pending = applications.filter(a => ['PENDING', 'UNDER_REVIEW'].includes(a.status)).length;
  const approved = applications.filter(a => ['APPROVED', 'OFFER_ACCEPTED', 'DOWN_PAYMENT_PENDING', 'DOWN_PAYMENT_COMPLETED', 'ORDER_CONFIRMED', 'ACTIVE_EMI'].includes(a.status)).length;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}><Text style={s.headerTitle}>My EMIs</Text></View>

      {/* Summary Bar */}
      <View style={s.summaryBar}>
        <View style={s.summaryItem}>
          <Text style={s.summaryVal}>{applications.length}</Text>
          <Text style={s.summaryLabel}>Total</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={[s.summaryVal, { color: Colors.warning }]}>{pending}</Text>
          <Text style={s.summaryLabel}>Pending</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={[s.summaryVal, { color: Colors.success }]}>{approved}</Text>
          <Text style={s.summaryLabel}>Approved</Text>
        </View>
      </View>

      <FlatList
        data={applications}
        keyExtractor={a => a.id}
        contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item: app }) => {
          const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG['PENDING'];
          const isApproved = ['APPROVED', 'DOWN_PAYMENT_PENDING'].includes(app.status);
          const needsDownPayment = app.status === 'DOWN_PAYMENT_PENDING';
          const emiAmount = app.monthlyEmi ?? app.estimatedMonthlyEmi;
          const downPay = app.approvedDownPayment ?? app.requestedDownPayment;
          const tenure = app.approvedTenure ?? app.requestedTenure;
          const date = new Date(app.submittedAt || app.createdAt);

          return (
            <View style={s.card}>
              {/* Card Header */}
              <View style={s.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.productName} numberOfLines={2}>{app.productName || 'Product'}</Text>
                  <Text style={s.appNum}>{app.applicationNumber}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                  <MaterialIcons name={cfg.icon as any} size={13} color={cfg.color} />
                  <Text style={[s.statusTxt, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>

              {/* Finance Details */}
              <View style={s.financeRow}>
                <View style={s.finItem}>
                  <Text style={s.finLabel}>Product Price</Text>
                  <Text style={s.finVal}>₹{app.sellingPrice.toLocaleString('en-IN')}</Text>
                </View>
                <View style={s.finItem}>
                  <Text style={s.finLabel}>Down Payment</Text>
                  <Text style={[s.finVal, isApproved && { color: Colors.primary }]}>₹{downPay.toLocaleString('en-IN')}</Text>
                </View>
                <View style={s.finItem}>
                  <Text style={s.finLabel}>EMI × {tenure}mo</Text>
                  <Text style={s.finVal}>₹{emiAmount.toLocaleString('en-IN')}</Text>
                </View>
              </View>

              {/* Admin Remarks */}
              {app.adminRemarks && (
                <View style={s.remarkBox}>
                  <MaterialIcons name="comment" size={13} color={Colors.textTertiary} />
                  <Text style={s.remarkTxt}>{app.adminRemarks}</Text>
                </View>
              )}
              {app.rejectionReason && (
                <View style={[s.remarkBox, { backgroundColor: '#FEE2E2' }]}>
                  <MaterialIcons name="cancel" size={13} color={Colors.error} />
                  <Text style={[s.remarkTxt, { color: Colors.error }]}>{app.rejectionReason}</Text>
                </View>
              )}

              {/* Date */}
              <Text style={s.dateText}>Applied: {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>

              {/* Action Button */}
              {needsDownPayment && (
                <Pressable style={s.actionBtn}>
                  <MaterialIcons name="payment" size={16} color="#fff" />
                  <Text style={s.actionBtnTxt}>Pay Down Payment ₹{downPay.toLocaleString('en-IN')}</Text>
                </Pressable>
              )}
              {app.status === 'APPROVED' && (
                <Pressable style={[s.actionBtn, { backgroundColor: Colors.success }]}>
                  <MaterialIcons name="thumb-up" size={16} color="#fff" />
                  <Text style={s.actionBtnTxt}>Accept Offer</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerTitle: { fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary },
  summaryBar: { flexDirection: 'row', backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: Radius.lg, padding: Spacing.md, ...Shadow.sm },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary },
  summaryLabel: { fontSize: Fonts.xs, color: Colors.textTertiary, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: Colors.borderLight, marginVertical: 4 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, ...Shadow.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.md },
  productName: { fontSize: Fonts.md, fontWeight: Fonts.bold, color: Colors.textPrimary, lineHeight: 20, flex: 1 },
  appNum: { fontSize: Fonts.xs, color: Colors.textTertiary, marginTop: 3, fontFamily: 'monospace' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, flexShrink: 0 },
  statusTxt: { fontSize: Fonts.xs, fontWeight: Fonts.semiBold },
  financeRow: { flexDirection: 'row', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  finItem: { flex: 1, alignItems: 'center' },
  finLabel: { fontSize: Fonts.xs, color: Colors.textTertiary, marginBottom: 4 },
  finVal: { fontSize: Fonts.sm, fontWeight: Fonts.bold, color: Colors.textPrimary },
  remarkBox: { flexDirection: 'row', gap: 8, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.sm, padding: 10, marginBottom: Spacing.sm },
  remarkTxt: { flex: 1, fontSize: Fonts.xs, color: Colors.textSecondary, lineHeight: 17 },
  dateText: { fontSize: Fonts.xs, color: Colors.textTertiary, marginBottom: Spacing.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 12, padding: 13, marginTop: 4 },
  actionBtnTxt: { color: '#fff', fontSize: Fonts.sm, fontWeight: Fonts.bold },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  emptyTitle: { fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  emptySub: { fontSize: Fonts.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  shopBtn: { backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 },
  shopBtnTxt: { color: '#fff', fontSize: Fonts.md, fontWeight: Fonts.bold },
});
