import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, BackHandler, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getEmiApplicationById, getAllFiCases, approveEmiApplication, EmiApplication } from '../../services/emiService';
import { getOrderById } from '../../services/orderService';
import { Order, OrderStatus } from '../../types/order';
import { findCreditReview } from '../data/creditReviewMockData';
import { findFiCaseForApplicationSync } from '../../fi/utils/findFiCaseForApplication';
import { getFiStatusLabel } from '../../fi/data/fiWorkflowStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DetailRow } from '../../components/ui/DetailRow';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { RootStackParamList } from '../../navigation/types';
import { EmiApplicationStatus } from '../../types/emiApplication';
import { FiCase, FiCaseStatus } from '../../types/fiCase';

type Props = NativeStackScreenProps<RootStackParamList, 'EmiApplicationDetails'>;

const STATUS_LABEL: Record<EmiApplicationStatus, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  hold: 'Hold',
};

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Order Confirmed',
  approved: 'Approved',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function formatAmount(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(date: string) {
  if (!date || date === '—') return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function displayMeta(value?: string) {
  return value && value !== '—' ? value : '—';
}

export function EmiApplicationDetailsScreen({ navigation, route }: Props) {
  const [application, setApplication] = useState<EmiApplication | null>(null);
  const [fiCase, setFiCase] = useState<FiCase | undefined>(undefined);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [approving, setApproving] = useState<boolean>(false);

  const fetchOrder = useCallback(async (app: EmiApplication) => {
    if (!app.orderId) {
      setOrder(null);
      return;
    }
    try {
      const found = await getOrderById(app.orderId);
      setOrder(found);
    } catch (error) {
      console.error('Failed to load order for application:', error);
      setOrder(null);
    }
  }, []);

  const reloadApplication = useCallback(async () => {
    const app = await getEmiApplicationById(route.params.applicationId);
    setApplication(app);
    if (app) {
      const fiList = await getAllFiCases();
      const found = findFiCaseForApplicationSync(app, fiList);
      setFiCase(found);
      await fetchOrder(app);
    }
  }, [route.params.applicationId, fetchOrder]);

  const handleApprove = useCallback(async () => {
    if (!application || approving) return;
    setApproving(true);
    try {
      await approveEmiApplication(application.id);
      setApplication((prev) => (prev ? { ...prev, status: 'approved' } : prev));
      await reloadApplication();
    } catch (error) {
      console.error('Failed to approve EMI application:', error);
    } finally {
      setApproving(false);
    }
  }, [application, approving, reloadApplication]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      setLoading(true);
      getEmiApplicationById(route.params.applicationId)
        .then(async (app) => {
          if (!isMounted) return;
          setApplication(app);
          if (app) {
            const fiList = await getAllFiCases();
            const found = findFiCaseForApplicationSync(app, fiList);
            if (isMounted) setFiCase(found);
            await fetchOrder(app);
          }
        })
        .catch((err) => console.error(err))
        .finally(() => {
          if (isMounted) setLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }, [route.params.applicationId, fetchOrder]),
  );
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

  const creditReview = application ? findCreditReview(application.id) : undefined;

  const creditReviewStatus = creditReview?.creditStatus ?? 'Waiting';

  const fiStatus: FiCaseStatus | undefined = fiCase?.status;
  const fiPending = fiStatus === 'pending';
  const fiButtonTitle = fiPending ? 'Start FI' : 'View FI';
  const fiCompleted = fiStatus === 'completed';

  const canApprove =
    application?.status === 'pending' || application?.status === 'under_review';

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>EMI Application Details</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.notFound}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.notFoundText, { marginTop: spacing.md }]}>Loading Application Details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!application) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>EMI Application Details</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Application not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const orderStatusLabel = order ? ORDER_STATUS_LABEL[order.status] : '—';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EMI Application Details</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card style={styles.section}>
          <SectionTitle title="Application Information" />
          <DetailRow label="Application ID" value={application.id} />
          <DetailRow label="Application Date" value={formatDate(application.applicationDate)} />
          <DetailRow label="Status" value={STATUS_LABEL[application.status]} isLast={!canApprove} />
          {canApprove && (
            <Button
              title={approving ? 'Approving...' : 'Approve Application'}
              variant="primary"
              disabled={approving}
              onPress={handleApprove}
              style={styles.workflowBtn}
            />
          )}
        </Card>

        <Card style={styles.section}>
          <SectionTitle title="Customer Information" />
          <DetailRow label="Customer Name" value={application.customerName} />
          <DetailRow label="Mobile Number" value={application.mobile} isLast />
        </Card>

        <Card style={styles.section}>
          <SectionTitle title="Product & EMI" />
          <DetailRow label="Selected Product" value={application.selectedProduct} />
          <DetailRow
            label="Requested Loan Amount"
            value={formatAmount(application.requestedLoanAmount)}
          />
          <DetailRow label="EMI Plan" value={application.emiPlan} isLast />
        </Card>

        {/* ── FI ─────────────────────────────────────────────────────────── */}
        <Card style={styles.section}>
          <SectionTitle title="Field Investigation" />
          <DetailRow
            label="Current Status"
            value={fiCase ? getFiStatusLabel(fiCase.status) : '—'}
          />
          <DetailRow
            label="Completed By"
            value={fiCompleted ? fiCase?.assignedExecutive ?? '—' : '—'}
          />
          <DetailRow
            label="Completed Date & Time"
            value={fiCompleted ? formatDate(fiCase?.assignedDate ?? '—') : '—'}
            isLast={!fiCase}
          />
          {fiCase && (
            <Button
              title={fiButtonTitle}
              variant="outline"
              onPress={() =>
                navigation.navigate('FiCaseDetails', { fiCaseId: fiCase.id })
              }
              style={styles.workflowBtn}
            />
          )}
        </Card>

        {/* ── Credit Review ──────────────────────────────────────────────── */}
        <Card style={styles.section}>
          <SectionTitle title="Credit Review" />
          <DetailRow label="Current Status" value={creditReviewStatus} />
          <DetailRow
            label="Completed By"
            value={
              creditReview?.creditStatus === 'Completed'
                ? displayMeta(creditReview.reviewer)
                : '—'
            }
          />
          <DetailRow
            label="Completed Date & Time"
            value={
              creditReview?.creditStatus === 'Completed'
                ? formatDate(creditReview.reviewDate)
                : '—'
            }
            isLast
          />
          <Button
            title="View Credit Review"
            variant="outline"
            onPress={() =>
              navigation.navigate('CreditReviewDetails', {
                applicationId: application.id,
              })
            }
            style={styles.workflowBtn}
          />
        </Card>

        {/* ── Down Payment (tracked on the application; collected from the
             customer after the offer is accepted) ─────────────────────── */}
        <Card style={styles.section}>
          <SectionTitle title="Down Payment" />
          <DetailRow
            label="Current Status"
            value={application.orderId || application.loanId ? 'Paid' : 'Pending'}
          />
          <DetailRow label="Completed By" value="—" />
          <DetailRow label="Completed Date & Time" value="—" isLast />
          <Text style={styles.helperText}>
            Down payment is collected from the customer after the offer is accepted. An
            order is created automatically once the payment is confirmed.
          </Text>
          {application.loanId && (
            <Button
              title="View Loan Ledger"
              variant="outline"
              onPress={() =>
                navigation.navigate('LoanDetails', { loanId: application.loanId! })
              }
              style={styles.workflowBtn}
            />
          )}
        </Card>

        {/* ── eKYC ───────────────────────────────────────────────────────── */}
        <Card style={styles.section}>
          <SectionTitle title="eKYC" />
          <DetailRow label="Current Status" value="—" />
          <DetailRow label="Completed By" value="—" />
          <DetailRow label="Completed Date & Time" value="—" isLast />
          <Text style={styles.helperText}>
            eKYC verification is performed in the Customer App during application
            submission.
          </Text>
        </Card>

        {/* ── eSign ──────────────────────────────────────────────────────── */}
        <Card style={styles.section}>
          <SectionTitle title="eSign" />
          <DetailRow label="Current Status" value="—" />
          <DetailRow label="Completed By" value="—" />
          <DetailRow label="Completed Date & Time" value="—" isLast />
          <Text style={styles.helperText}>
            Agreement signing happens in the Customer App after the offer is accepted.
          </Text>
        </Card>

        {/* ── eMandate ───────────────────────────────────────────────────── */}
        <Card style={styles.section}>
          <SectionTitle title="eMandate" />
          <DetailRow label="Current Status" value="—" />
          <DetailRow label="Completed By" value="—" />
          <DetailRow label="Completed Date & Time" value="—" isLast />
          <Text style={styles.helperText}>
            eMandate registration is handled by the Finance Portal.
          </Text>
        </Card>

        {/* ── Disbursement ───────────────────────────────────────────────── */}
        <Card style={styles.section}>
          <SectionTitle title="Disbursement" />
          <DetailRow label="Current Status" value="—" />
          <DetailRow label="Completed By" value="—" />
          <DetailRow label="Completed Date & Time" value="—" isLast />
          <Text style={styles.helperText}>
            Disbursement is handled by the Finance Portal.
          </Text>
        </Card>

        {/* ── Order (created by the backend after down payment) ──────────── */}
        <Card style={styles.section}>
          <SectionTitle title="Order" />
          <DetailRow label="Current Status" value={orderStatusLabel} />
          <DetailRow label="Order ID" value={order ? order.id : '—'} />
          <DetailRow
            label="Order Date"
            value={order ? formatDate(order.orderDate) : '—'}
            isLast
          />
          {order ? (
            <Button
              title="View Order"
              variant="outline"
              onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
              style={styles.workflowBtn}
            />
          ) : (
            <Text style={styles.helperText}>
              Order is created automatically after the customer completes the down
              payment.
            </Text>
          )}
        </Card>

        {/* ── Dispatch (managed via the real order) ──────────────────────── */}
        <Card style={styles.section}>
          <SectionTitle title="Dispatch" />
          <DetailRow label="Current Status" value={orderStatusLabel} />
          <DetailRow label="Courier / Tracking" value="Tracked in Order Details" />
          <DetailRow label="Dispatched Date & Time" value="—" isLast />
          {order ? (
            <Button
              title="Manage Dispatch"
              variant="outline"
              onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
              style={styles.workflowBtn}
            />
          ) : (
            <Text style={styles.helperText}>
              Dispatch is managed from the Order once it is created.
            </Text>
          )}
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textHeading },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  section: { marginBottom: spacing.md },
  workflowBtn: {
    marginTop: spacing.md,
  },
  helperText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: colors.textSecondary },
});
