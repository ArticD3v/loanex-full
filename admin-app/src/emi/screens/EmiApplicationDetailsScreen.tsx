import React, { useCallback, useState, useSyncExternalStore } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, BackHandler, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getEmiApplicationById, getAllFiCases, approveEmiApplication, EmiApplication } from '../../services/emiService';
import { findCreditReview } from '../data/creditReviewMockData';
import { findDownPayment } from '../data/emiLifecycleMockData';
import {
  canPerformLifecycleActions,
  createOrder,
  generateAgreement,
  getDisbursementDetails,
  getDispatchDetails,
  getEkycDetails,
  getESignDetails,
  getLifecycleWorkflowVersion,
  getMandateDetails,
  getOrderDetails,
  isDisbursementCompleted,
  isEkycCompleted,
  isEMandateCompleted,
  isESignCompleted,
  isOrderCreated,
  startDispatch,
  startDisbursement,
  startEkyc,
  startEMandate,
  startESign,
  subscribeLifecycleWorkflow,
} from '../data/emiLifecycleWorkflowStore';
import {
  formatCurrencyAmount,
  formatPercent,
  formatTenureMonths,
  getFinancialOverride,
  getFinancialOverrideVersion,
  subscribeFinancialOverrides,
} from '../data/financialOverrideStore';
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

function formatDateTime(value: string) {
  if (!value || value === '—') return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function displayMeta(value?: string) {
  return value && value !== '—' ? value : '—';
}

export function EmiApplicationDetailsScreen({ navigation, route }: Props) {
  const [application, setApplication] = useState<EmiApplication | null>(null);
  const [fiCase, setFiCase] = useState<FiCase | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [approving, setApproving] = useState<boolean>(false);

  const reloadApplication = useCallback(async () => {
    const app = await getEmiApplicationById(route.params.applicationId);
    setApplication(app);
    if (app) {
      const fiList = await getAllFiCases();
      const found = findFiCaseForApplicationSync(app, fiList);
      setFiCase(found);
    }
  }, [route.params.applicationId]);

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

  useSyncExternalStore(
    subscribeFinancialOverrides,
    getFinancialOverrideVersion,
    getFinancialOverrideVersion,
  );

  useSyncExternalStore(
    subscribeLifecycleWorkflow,
    getLifecycleWorkflowVersion,
    getLifecycleWorkflowVersion,
  );

  const financialOverride = application
    ? getFinancialOverride(
        application.id,
        application.selectedProduct,
        application.emiPlan,
      )
    : undefined;

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
          }
        })
        .catch((err) => console.error(err))
        .finally(() => {
          if (isMounted) setLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }, [route.params.applicationId]),
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
  const downPayment = application ? findDownPayment(application.id) : undefined;
  const ekyc = application ? getEkycDetails(application.id) : undefined;
  const eSign = application ? getESignDetails(application.id) : undefined;
  const mandate = application ? getMandateDetails(application.id) : undefined;
  const disbursement = application ? getDisbursementDetails(application.id) : undefined;
  const emiOrder = application ? getOrderDetails(application.id) : undefined;
  const dispatch = application ? getDispatchDetails(application.id) : undefined;

  const creditReviewStatus = creditReview?.creditStatus ?? 'Waiting';
  const creditApproved = creditReview?.decision === 'Approved';
  const showFinalApprovedOffer = creditApproved && financialOverride;

  const performActions = canPerformLifecycleActions();

  const ekycDone = application ? isEkycCompleted(application.id) : false;
  const eSignDone = application ? isESignCompleted(application.id) : false;
  const mandateDone = application ? isEMandateCompleted(application.id) : false;
  const disbursementDone = application ? isDisbursementCompleted(application.id) : false;
  const orderCreated = application ? isOrderCreated(application.id) : false;

  const ekycUnlocked = creditApproved;
  const eSignUnlocked = ekycDone;
  const mandateUnlocked = eSignDone;
  const disbursementUnlocked = mandateDone;
  const orderUnlocked = disbursementDone;
  const dispatchUnlocked = orderCreated;

  const orderStatus = emiOrder?.status ?? 'Not Created';
  const dispatchStatus = dispatch?.dispatchStatus ?? 'Pending';

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

  const ekycStatus = ekyc?.status ?? 'Pending';
  const eSignStatus = eSign?.status ?? 'Pending';
  const mandateStatus = mandate?.status ?? 'Pending';
  const disbursementStatus = disbursement?.status ?? 'Pending';

  const canStartEkyc =
    performActions && ekycUnlocked && (ekycStatus === 'Pending' || ekycStatus === 'Failed');
  const canViewEkyc = ekycStatus === 'Completed' || ekycStatus === 'In Progress';

  const canGenerateAgreement =
    performActions && eSignUnlocked && eSignStatus === 'Pending';
  const canStartESign =
    performActions && eSignUnlocked && eSignStatus === 'Agreement Generated';
  const canViewSignedAgreement = eSignStatus === 'Signed';

  const canStartEMandate =
    performActions && mandateUnlocked && (mandateStatus === 'Pending' || mandateStatus === 'Failed');
  const canViewMandate = mandateStatus === 'Active';

  const canStartDisbursement =
    performActions &&
    disbursementUnlocked &&
    (disbursementStatus === 'Pending' || disbursementStatus === 'Processing');
  const canViewDisbursement =
    disbursementStatus === 'Completed' || disbursementStatus === 'Processing';

  const canCreateOrder = performActions && orderUnlocked && !orderCreated;
  const canViewOrder = orderCreated;
  const canStartDispatchAction = performActions && dispatchUnlocked && !dispatch;
  const canViewDispatch = Boolean(dispatch);

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

        {showFinalApprovedOffer ? (
          <Card style={styles.section}>
            <SectionTitle title="Final Approved Offer" />
            <DetailRow
              label="Default Down Payment"
              value={formatCurrencyAmount(financialOverride.defaults.downPaymentAmount)}
            />
            <DetailRow
              label="Approved Down Payment"
              value={formatCurrencyAmount(financialOverride.approved.downPaymentAmount)}
            />
            <DetailRow
              label="Interest Rate"
              value={formatPercent(financialOverride.approved.interestRatePercent)}
            />
            <DetailRow
              label="EMI Tenure"
              value={formatTenureMonths(financialOverride.approved.emiTenureMonths)}
            />
            <DetailRow
              label="Processing Fee"
              value={formatCurrencyAmount(financialOverride.approved.processingFee)}
            />
            <DetailRow
              label="Service Charges"
              value={formatCurrencyAmount(financialOverride.approved.serviceCharges)}
            />
            <DetailRow
              label="Other Charges"
              value={formatCurrencyAmount(financialOverride.approved.otherCharges)}
            />
            <DetailRow label="EMI Plan" value={financialOverride.approved.emiPlan} isLast />
          </Card>
        ) : null}

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

        {/* ── Down Payment (existing card; not part of sequential gate) ─── */}
        <Card style={styles.section}>
          <SectionTitle title="Down Payment" />
          <DetailRow label="Current Status" value={downPayment?.status ?? 'Pending'} />
          <DetailRow
            label="Completed By"
            value={displayMeta(downPayment?.completedBy ?? downPayment?.collectedBy)}
          />
          <DetailRow
            label="Completed Date & Time"
            value={
              downPayment?.status === 'Paid'
                ? formatDateTime(downPayment.completedAt ?? downPayment.paidOn)
                : '—'
            }
            isLast
          />
          <Button
            title="View Down Payment"
            variant="outline"
            onPress={() =>
              navigation.navigate('DownPaymentDetails', { applicationId: application.id })
            }
            style={styles.workflowBtn}
          />
        </Card>

        {/* ── eKYC ───────────────────────────────────────────────────────── */}
        <Card style={styles.section}>
          <SectionTitle title="eKYC" />
          <DetailRow label="Current Status" value={ekycStatus} />
          <DetailRow label="Completed By" value={displayMeta(ekyc?.completedBy)} />
          <DetailRow
            label="Completed Date & Time"
            value={ekycDone ? formatDateTime(ekyc?.completedAt ?? '—') : '—'}
            isLast
          />
          {!ekycUnlocked && (
            <Text style={styles.helperText}>
              eKYC will be available after Credit Review is Approved.
            </Text>
          )}
          <Button
            title="Start eKYC"
            variant="outline"
            disabled={!canStartEkyc}
            onPress={() => startEkyc(application.id)}
            style={styles.workflowBtn}
          />
          <Button
            title="View eKYC"
            variant="outline"
            disabled={!canViewEkyc}
            onPress={() =>
              navigation.navigate('EkycDetails', { applicationId: application.id })
            }
            style={styles.workflowBtn}
          />
        </Card>

        {/* ── eSign ──────────────────────────────────────────────────────── */}
        <Card style={styles.section}>
          <SectionTitle title="eSign" />
          <DetailRow label="Current Status" value={eSignStatus} />
          <DetailRow label="Completed By" value={displayMeta(eSign?.completedBy)} />
          <DetailRow
            label="Completed Date & Time"
            value={eSignDone ? formatDateTime(eSign?.completedAt ?? '—') : '—'}
            isLast
          />
          {!eSignUnlocked && (
            <Text style={styles.helperText}>
              eSign will be available after eKYC is Completed.
            </Text>
          )}
          <Button
            title="Generate Agreement"
            variant="outline"
            disabled={!canGenerateAgreement}
            onPress={() => generateAgreement(application.id)}
            style={styles.workflowBtn}
          />
          <Button
            title="Start eSign"
            variant="outline"
            disabled={!canStartESign}
            onPress={() => startESign(application.id)}
            style={styles.workflowBtn}
          />
          <Button
            title="View Signed Agreement"
            variant="outline"
            disabled={!canViewSignedAgreement}
            onPress={() =>
              navigation.navigate('ESignDetails', { applicationId: application.id })
            }
            style={styles.workflowBtn}
          />
        </Card>

        {/* ── eMandate ───────────────────────────────────────────────────── */}
        <Card style={styles.section}>
          <SectionTitle title="eMandate" />
          <DetailRow label="Current Status" value={mandateStatus} />
          <DetailRow label="Completed By" value={displayMeta(mandate?.completedBy)} />
          <DetailRow
            label="Completed Date & Time"
            value={mandateDone ? formatDateTime(mandate?.completedAt ?? '—') : '—'}
            isLast
          />
          {!mandateUnlocked && (
            <Text style={styles.helperText}>
              eMandate will be available after eSign is Completed.
            </Text>
          )}
          <Button
            title="Start eMandate"
            variant="outline"
            disabled={!canStartEMandate}
            onPress={() => startEMandate(application.id)}
            style={styles.workflowBtn}
          />
          <Button
            title="View Mandate"
            variant="outline"
            disabled={!canViewMandate}
            onPress={() =>
              navigation.navigate('MandateDetails', { applicationId: application.id })
            }
            style={styles.workflowBtn}
          />
        </Card>

        {/* ── Disbursement ───────────────────────────────────────────────── */}
        <Card style={styles.section}>
          <SectionTitle title="Disbursement" />
          <DetailRow label="Current Status" value={disbursementStatus} />
          <DetailRow label="Completed By" value={displayMeta(disbursement?.completedBy)} />
          <DetailRow
            label="Completed Date & Time"
            value={disbursementDone ? formatDateTime(disbursement?.completedAt ?? '—') : '—'}
            isLast
          />
          {!disbursementUnlocked && (
            <Text style={styles.helperText}>
              Disbursement will be available after eMandate is Completed.
            </Text>
          )}
          <Button
            title="Start Disbursement"
            variant="outline"
            disabled={!canStartDisbursement}
            onPress={() => startDisbursement(application.id)}
            style={styles.workflowBtn}
          />
          <Button
            title="View Details"
            variant="outline"
            disabled={!canViewDisbursement}
            onPress={() =>
              navigation.navigate('DisbursementDetails', { applicationId: application.id })
            }
            style={styles.workflowBtn}
          />
        </Card>

        {/* ── Order ──────────────────────────────────────────────────────── */}
        <Card style={styles.section}>
          <SectionTitle title="Order" />
          <DetailRow label="Current Status" value={orderStatus} />
          <DetailRow
            label="Completed By"
            value={orderCreated ? 'System (Mock)' : '—'}
          />
          <DetailRow
            label="Completed Date & Time"
            value={orderCreated ? formatDate(emiOrder?.orderDate ?? '—') : '—'}
            isLast
          />
          {!orderUnlocked && (
            <Text style={styles.helperText}>
              Order will be available after Disbursement is Completed.
            </Text>
          )}
          {orderUnlocked && !orderCreated && (
            <Text style={styles.helperText}>
              Create an order to proceed to Dispatch.
            </Text>
          )}
          <Button
            title="Create Order"
            variant="outline"
            disabled={!canCreateOrder}
            onPress={() => createOrder(application.id)}
            style={styles.workflowBtn}
          />
          <Button
            title="View Order"
            variant="outline"
            disabled={!canViewOrder}
            onPress={() =>
              navigation.navigate('EmiOrderDetails', { applicationId: application.id })
            }
            style={styles.workflowBtn}
          />
        </Card>

        {/* ── Dispatch ───────────────────────────────────────────────────── */}
        <Card style={styles.section}>
          <SectionTitle title="Dispatch" />
          <DetailRow label="Current Status" value={dispatchStatus} />
          <DetailRow
            label="Completed By"
            value={dispatch ? 'Logistics (Mock)' : '—'}
          />
          <DetailRow
            label="Completed Date & Time"
            value={dispatch ? formatDate(dispatch.dispatchDate) : '—'}
            isLast
          />
          {!dispatchUnlocked && (
            <Text style={styles.helperText}>
              Dispatch will be available after Order is Created.
            </Text>
          )}
          <Button
            title="Start Dispatch"
            variant="outline"
            disabled={!canStartDispatchAction}
            onPress={() => startDispatch(application.id)}
            style={styles.workflowBtn}
          />
          <Button
            title="View Dispatch"
            variant="outline"
            disabled={!canViewDispatch}
            onPress={() =>
              navigation.navigate('DispatchDetails', { applicationId: application.id })
            }
            style={styles.workflowBtn}
          />
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
