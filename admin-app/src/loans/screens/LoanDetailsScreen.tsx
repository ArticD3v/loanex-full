import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getLoanById, Loan, LoanScheduleRow } from '../../services/emiService';
import { Card } from '../../components/ui/Card';
import { DetailRow } from '../../components/ui/DetailRow';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LoanDetails'>;

const PAY_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  FAILED: 'Failed',
};

const PAY_STATUS_COLOR: Record<string, string> = {
  PENDING: '#6B7280',
  PAID: '#059669',
  OVERDUE: '#DC2626',
  FAILED: '#DC2626',
};

function formatMoney(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return '—';
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function LoanDetailsScreen({ navigation, route }: Props) {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getLoanById(route.params.loanId);
      setLoan(data);
    } catch (err) {
      console.warn('Failed to load loan details', err);
    } finally {
      setLoading(false);
    }
  }, [route.params.loanId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('LoanList');
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loan Details</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.notFound}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.notFoundText, { marginTop: spacing.md }]}>Loading Loan Details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!loan) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loan Details</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Loan not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const schedule = loan.schedule ?? [];
  const paidEmis = schedule.filter((r) => r.paymentStatus === 'PAID');
  const overdueEmis = schedule.filter((r) => r.paymentStatus === 'OVERDUE');
  const remainingEmis = schedule.length - paidEmis.length;
  const progress =
    schedule.length > 0 ? Math.round((paidEmis.length / schedule.length) * 100) : 0;

  const renderStatusBadge = (status: string) => {
    const color = PAY_STATUS_COLOR[status] ?? PAY_STATUS_COLOR.PENDING;
    return (
      <View style={[styles.statusBadge, { backgroundColor: color + '1A' }]}>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
        <Text style={[styles.statusText, { color }]}>
          {PAY_STATUS_LABEL[status] ?? status}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Loan Details</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Loan Account ─────────────────────────────────────────────── */}
        <Card style={styles.section}>
          <SectionTitle title="Loan Account" />
          <DetailRow label="Loan Account Number" value={loan.loanAccountNumber} />
          <DetailRow label="Application" value={loan.applicationNumber || loan.applicationId} />
          <DetailRow label="Product" value={loan.productName || loan.productId} />
          <DetailRow label="Loan Amount" value={formatMoney(loan.loanAmount)} />
          <DetailRow label="Interest Rate" value={`${loan.interestRate}%`} />
          <DetailRow label="Tenure" value={`${loan.loanTenure} months`} />
          <DetailRow label="EMI Amount" value={formatMoney(loan.emiAmount)} />
          <DetailRow label="Total Payable" value={formatMoney(loan.totalPayable)} />
          <DetailRow label="Processing Fee" value={formatMoney(loan.processingFee)} />
          <DetailRow label="Loan Start" value={formatDate(loan.loanStartDate)} />
          <DetailRow label="Loan End" value={formatDate(loan.loanEndDate)} isLast />
        </Card>

        {/* ── Customer ─────────────────────────────────────────────────── */}
        <Card style={styles.section}>
          <SectionTitle title="Customer" />
          <DetailRow label="Name" value={loan.customer?.fullName ?? '—'} />
          <DetailRow label="Mobile" value={loan.customer?.mobile ?? '—'} />
          <DetailRow label="Email" value={loan.customer?.email ?? '—'} isLast />
        </Card>

        {/* ── Payment Status ───────────────────────────────────────────── */}
        <Card style={styles.section}>
          <SectionTitle title="Payment Status" />
          <DetailRow label="Down Payment Paid" value={formatMoney(loan.downPaymentPaid)} />
          <DetailRow label="Total Paid" value={formatMoney(loan.paidAmount)} />
          <DetailRow label="Outstanding" value={formatMoney(loan.outstandingAmount)} />
          <DetailRow label="Next EMI Due" value={formatDate(loan.nextEmiDueDate)} />
          <DetailRow label="Last Payment" value={formatDate(loan.lastPaymentDate)} />
          <DetailRow
            label="Loan Status"
            value={loan.loanStatus === 'CLOSED' ? 'Closed' : 'Active'}
            isLast
          />
        </Card>

        {/* ── EMI Progress ─────────────────────────────────────────────── */}
        <Card style={styles.section}>
          <SectionTitle title="EMI Progress" />
          <View style={styles.progressRow}>
            <View style={styles.progressMeta}>
              <Text style={styles.progressBig}>{paidEmis.length}/{schedule.length}</Text>
              <Text style={styles.progressCaption}>EMIs paid</Text>
            </View>
            <View style={styles.progressBarWrap}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
            <View style={styles.progressMetaRight}>
              <Text style={styles.progressBigGold}>{remainingEmis}</Text>
              <Text style={styles.progressCaption}>remaining</Text>
            </View>
          </View>
          {overdueEmis.length > 0 && (
            <View style={styles.overdueNote}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.overdueText}>
                {overdueEmis.length} EMI{overdueEmis.length > 1 ? 's are' : ' is'} overdue
              </Text>
            </View>
          )}
        </Card>

        {/* ── EMI Schedule / Ledger ────────────────────────────────────── */}
        <Card style={styles.section}>
          <SectionTitle title="EMI Schedule" />
          {schedule.length === 0 ? (
            <Text style={styles.helperText}>
              No EMI schedule available for this loan yet.
            </Text>
          ) : (
            <View style={styles.tableWrap}>
              <View style={[styles.tableRow, styles.tableHead]}>
                <Text style={[styles.th, styles.colNum]}>EMI</Text>
                <Text style={[styles.th, styles.colDate]}>Due</Text>
                <Text style={[styles.th, styles.colAmt]}>Amount</Text>
                <Text style={[styles.th, styles.colStatus]}>Status</Text>
              </View>
              {schedule.map((row: LoanScheduleRow) => (
                <View key={row.id} style={styles.tableRow}>
                  <Text style={[styles.td, styles.colNum]}>#{row.emiNumber}</Text>
                  <Text style={[styles.td, styles.colDate]}>{formatDate(row.dueDate)}</Text>
                  <Text style={[styles.td, styles.colAmt]}>{formatMoney(row.emiAmount)}</Text>
                  <View style={styles.colStatus}>{renderStatusBadge(row.paymentStatus)}</View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* ── Notes ────────────────────────────────────────────────────── */}
        <Card style={styles.section}>
          <SectionTitle title="Application Notes" />
          <DetailRow
            label="Status"
            value={loan.application?.status ?? '—'}
          />
          <DetailRow
            label="Admin Remarks"
            value={loan.application?.adminRemarks ?? '—'}
            isLast
          />
          <Text style={styles.helperText}>
            EMI payments are collected from the customer via Razorpay. Each paid
            instalment updates this ledger automatically.
          </Text>
        </Card>
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
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textHeading },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  section: { marginBottom: spacing.md },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: colors.textSecondary },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  progressMeta: { width: 64 },
  progressMetaRight: { width: 64, alignItems: 'flex-end' },
  progressBig: { fontSize: 22, fontWeight: '800', color: colors.textHeading },
  progressBigGold: { fontSize: 22, fontWeight: '800', color: colors.accentDark },
  progressCaption: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  progressBarWrap: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.borderLight, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 5, backgroundColor: colors.primary },
  overdueNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: '#DC26261A',
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  overdueText: { fontSize: 13, color: '#DC2626', fontWeight: '600' },
  tableWrap: { marginTop: spacing.sm },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tableHead: { borderBottomWidth: 2, borderBottomColor: colors.border },
  th: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  td: { fontSize: 13, color: colors.text },
  colNum: { width: 52 },
  colDate: { flex: 1 },
  colAmt: { width: 92, textAlign: 'right' },
  colStatus: { width: 92, alignItems: 'flex-end' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.lg },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  helperText: { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 18 },
});
