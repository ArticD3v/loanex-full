import React, { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  BackHandler,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  findCreditReview,
  updateCreditReviewDecision,
} from '../data/creditReviewMockData';
import { getEmiApplicationById, EmiApplication } from '../../services/emiService';
import {
  FINANCIAL_EMI_PLAN_OPTIONS,
  applyFinancialOverride,
  formatCurrencyAmount,
  formatOverrideDateTime,
  formatPercent,
  formatTenureMonths,
  getFinancialOverride,
  getFinancialOverrideVersion,
  subscribeFinancialOverrides,
} from '../data/financialOverrideStore';
import { getProducts } from '../../services/productService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DetailRow } from '../../components/ui/DetailRow';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { Input } from '../../components/ui/Input';
import { Dropdown } from '../../components/ui/Dropdown';
import { CreditDecision } from '../../types/creditReview';
import { FinancialValues } from '../../types/financialOverride';
import { useTheme } from '../../theme/useTheme';
import { spacing } from '../../theme/spacing';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreditReviewDetails'>;

const AUTHORIZED_OVERRIDE_USER = 'Neha Kapoor';

function formatDate(date: string) {
  if (!date || date === '—') return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function parseNonNegative(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || !/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const n = parseFloat(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function CreditReviewDetailsScreen({ navigation, route }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const applicationId = route.params.applicationId;
  const [review, setReview] = useState(() => findCreditReview(applicationId));
  const [application, setApplication] = useState<EmiApplication | null>(null);

  const productName = application?.selectedProduct ?? review?.selectedProduct ?? '';
  const applicationEmiPlan = application?.emiPlan;
  const loanAmount = application?.requestedLoanAmount ?? 0;
  
  const [productPrice, setProductPrice] = useState(loanAmount);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadProductPrice() {
        if (!productName) return;
        try {
          const products = await getProducts();
          const found = products.find(p => p.name === productName);
          if (active && found) {
            setProductPrice(found.sellingPrice || loanAmount);
          }
        } catch (e) {}
      }
      loadProductPrice();
      return () => { active = false; };
    }, [productName, loanAmount])
  );

  useSyncExternalStore(
    subscribeFinancialOverrides,
    getFinancialOverrideVersion,
    getFinancialOverrideVersion,
  );

  const [overrideRecord, setOverrideRecord] = useState(() =>
    getFinancialOverride(applicationId, productName, applicationEmiPlan),
  );

  const [approvedDownPayment, setApprovedDownPayment] = useState(
    String(overrideRecord.approved.downPaymentAmount),
  );
  const [approvedInterestRate, setApprovedInterestRate] = useState(
    String(overrideRecord.approved.interestRatePercent),
  );
  const [approvedTenure, setApprovedTenure] = useState(
    String(overrideRecord.approved.emiTenureMonths),
  );
  const [approvedProcessingFee, setApprovedProcessingFee] = useState(
    String(overrideRecord.approved.processingFee),
  );
  const [approvedServiceCharges, setApprovedServiceCharges] = useState(
    String(overrideRecord.approved.serviceCharges),
  );
  const [approvedOtherCharges, setApprovedOtherCharges] = useState(
    String(overrideRecord.approved.otherCharges),
  );
  const [approvedEmiPlan, setApprovedEmiPlan] = useState(overrideRecord.approved.emiPlan);
  const [overrideReason, setOverrideReason] = useState(
    overrideRecord.overrideStatus === 'Overridden' ? overrideRecord.overrideReason : '',
  );

  const syncFormFromRecord = useCallback(
    (record: ReturnType<typeof getFinancialOverride>) => {
      setOverrideRecord(record);
      setApprovedDownPayment(String(record.approved.downPaymentAmount));
      setApprovedInterestRate(String(record.approved.interestRatePercent));
      setApprovedTenure(String(record.approved.emiTenureMonths));
      setApprovedProcessingFee(String(record.approved.processingFee));
      setApprovedServiceCharges(String(record.approved.serviceCharges));
      setApprovedOtherCharges(String(record.approved.otherCharges));
      setApprovedEmiPlan(record.approved.emiPlan);
      setOverrideReason(record.overrideStatus === 'Overridden' ? record.overrideReason : '');
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      setReview(findCreditReview(applicationId));
      getEmiApplicationById(applicationId).then((app) => setApplication(app));
      const latest = getFinancialOverride(applicationId, productName, applicationEmiPlan);
      syncFormFromRecord(latest);
    }, [applicationId, productName, applicationEmiPlan, syncFormFromRecord]),
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

  const buildApprovedValues = (): FinancialValues | null => {
    const downPaymentAmount = parseNonNegative(approvedDownPayment);
    const interestRatePercent = parseNonNegative(approvedInterestRate);
    const emiTenureMonths = parseNonNegative(approvedTenure);
    const processingFee = parseNonNegative(approvedProcessingFee);
    const serviceCharges = parseNonNegative(approvedServiceCharges);
    const otherCharges = parseNonNegative(approvedOtherCharges);

    if (downPaymentAmount === null) {
      Alert.alert(
        'Invalid Down Payment',
        'Down Payment Amount must be numeric and cannot be negative.',
      );
      return null;
    }
    if (productPrice > 0 && downPaymentAmount > productPrice) {
      Alert.alert(
        'Invalid Down Payment',
        `Down Payment Amount cannot exceed Product Price (${formatCurrencyAmount(productPrice)}).`,
      );
      return null;
    }
    if (loanAmount > 0 && downPaymentAmount > loanAmount) {
      Alert.alert(
        'Invalid Down Payment',
        `Down Payment Amount cannot exceed Loan Amount (${formatCurrencyAmount(loanAmount)}).`,
      );
      return null;
    }
    if (interestRatePercent === null) {
      Alert.alert('Invalid Interest Rate', 'Interest Rate cannot be negative.');
      return null;
    }
    if (emiTenureMonths === null || emiTenureMonths <= 0) {
      Alert.alert('Invalid Tenure', 'Tenure must be greater than zero.');
      return null;
    }
    if (processingFee === null) {
      Alert.alert('Invalid Processing Fee', 'Processing Fee cannot be negative.');
      return null;
    }
    if (serviceCharges === null) {
      Alert.alert('Invalid Service Charges', 'Charges cannot be negative.');
      return null;
    }
    if (otherCharges === null) {
      Alert.alert('Invalid Other Charges', 'Charges cannot be negative.');
      return null;
    }
    if (!approvedEmiPlan.trim()) {
      Alert.alert('EMI Plan Required', 'Select an Approved EMI Plan.');
      return null;
    }

    return {
      downPaymentAmount,
      interestRatePercent,
      emiTenureMonths: Math.round(emiTenureMonths),
      processingFee,
      serviceCharges,
      otherCharges,
      emiPlan: approvedEmiPlan.trim(),
    };
  };

  const applyDecision = (
    decision: CreditDecision,
    remarks: string,
    extra?: Partial<NonNullable<typeof review>>,
  ) => {
    const updated = updateCreditReviewDecision(applicationId, {
      decision,
      remarks,
      creditStatus:
        decision === 'Approved' || decision === 'Rejected'
          ? 'Completed'
          : decision === 'Hold'
            ? 'On Hold'
            : 'In Progress',
      reviewDate: new Date().toISOString().slice(0, 10),
      reviewer: AUTHORIZED_OVERRIDE_USER,
      ...extra,
    });
    setReview(updated ? { ...updated } : undefined);
    Alert.alert('Credit Review Updated', `${decision} recorded (UI only — no backend).`);
  };

  const handleApprove = () => {
    Alert.alert(
      'Approve',
      'Approve this credit review? Final Approved Offer will use the approved financial values for this application only.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            const latest = getFinancialOverride(applicationId, productName, applicationEmiPlan);
            applyDecision('Approved', 'Application approved after credit checks.', {
              downPayment: formatCurrencyAmount(latest.approved.downPaymentAmount),
            });
          },
        },
      ],
    );
  };

  const handleReject = () => {
    Alert.alert('Reject', 'Reject this credit review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => applyDecision('Rejected', 'Application rejected after credit assessment.'),
      },
    ]);
  };

  const handleHold = () => {
    Alert.alert('Hold', 'Place this credit review on hold?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Hold',
        onPress: () => applyDecision('Hold', 'Application placed on hold pending clarification.'),
      },
    ]);
  };

  const handleRequestDocuments = () => {
    Alert.alert('Request Documents', 'Request additional documents from the customer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Request',
        onPress: () =>
          applyDecision(
            'Documents Requested',
            'Additional bank statements / income proofs requested.',
          ),
      },
    ]);
  };

  const handleRecommendAlternate = () => {
    const alternate = 'Samsung Galaxy A55 128GB';
    Alert.alert(
      'Recommend Alternate Product',
      `Recommend alternate product "${alternate}" for this application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Recommend',
          onPress: () =>
            applyDecision(
              'Alternate Product Recommended',
              `Recommended alternate product: ${alternate}`,
              {
                recommendedProduct: alternate,
                selectedProduct: alternate,
              },
            ),
        },
      ],
    );
  };

  const handleApplyOverride = () => {
    const approved = buildApprovedValues();
    if (!approved) return;

    const defaults = overrideRecord.defaults;
    const unchanged =
      approved.downPaymentAmount === defaults.downPaymentAmount &&
      approved.interestRatePercent === defaults.interestRatePercent &&
      approved.emiTenureMonths === defaults.emiTenureMonths &&
      approved.processingFee === defaults.processingFee &&
      approved.serviceCharges === defaults.serviceCharges &&
      approved.otherCharges === defaults.otherCharges &&
      approved.emiPlan === defaults.emiPlan;

    if (unchanged) {
      Alert.alert('No Override Applied', 'No values were changed from the product defaults.');
      const updated = applyFinancialOverride(
        applicationId,
        productName,
        {
          approved,
          overrideReason: '',
          approvedBy: AUTHORIZED_OVERRIDE_USER,
        },
        applicationEmiPlan,
      );
      syncFormFromRecord(updated);
      return;
    }

    if (!overrideReason.trim()) {
      Alert.alert('Reason Required', 'Override reason is required when approved values differ from defaults.');
      return;
    }

    Alert.alert(
      'Apply Financial Override',
      'Save customer-specific approved values for this EMI application only? Product defaults will not change.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply Override',
          onPress: () => {
            const updated = applyFinancialOverride(
              applicationId,
              productName,
              {
                approved,
                overrideReason: overrideReason.trim(),
                approvedBy: AUTHORIZED_OVERRIDE_USER,
              },
              applicationEmiPlan,
            );
            syncFormFromRecord(updated);
            updateCreditReviewDecision(applicationId, {
              downPayment: formatCurrencyAmount(updated.approved.downPaymentAmount),
            });
            setReview(findCreditReview(applicationId));
            Alert.alert(
              'Override Applied',
              'Customer-specific financial override saved for this EMI application only (UI only).',
            );
          },
        },
      ],
    );
  };

  const emiPlanOptions = useMemo(() => {
    const options = [...FINANCIAL_EMI_PLAN_OPTIONS];
    if (approvedEmiPlan && !options.includes(approvedEmiPlan)) {
      options.unshift(approvedEmiPlan);
    }
    if (overrideRecord.defaults.emiPlan && !options.includes(overrideRecord.defaults.emiPlan)) {
      options.unshift(overrideRecord.defaults.emiPlan);
    }
    return options;
  }, [approvedEmiPlan, overrideRecord.defaults.emiPlan]);

  if (!review) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Credit Review</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Credit review not found</Text>
          <Button title="Back" variant="outline" onPress={handleGoBack} style={styles.backAction} />
        </View>
      </SafeAreaView>
    );
  }

  const { defaults, approved } = overrideRecord;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Credit Review</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card style={styles.section}>
          <SectionTitle title="Application Summary" />
          <DetailRow label="Application" value={application?.id ?? applicationId} />
          <DetailRow label="Customer" value={application?.customerName ?? '—'} />
          <DetailRow label="Credit Status" value={review.creditStatus} />
          <DetailRow label="Reviewer" value={review.reviewer} />
          <DetailRow label="Review Date" value={formatDate(review.reviewDate)} />
          <DetailRow label="Decision" value={review.decision} isLast />
        </Card>

        <Card style={styles.section}>
          <SectionTitle title="KYC & Identity" />
          <DetailRow label="KYC Status" value={review.kycStatus} />
          <DetailRow label="Aadhaar Status" value={review.aadhaarStatus} />
          <DetailRow label="PAN Status" value={review.panStatus} isLast />
        </Card>

        <Card style={styles.section}>
          <SectionTitle title="Banking & FI" />
          <DetailRow label="Banking Details" value={review.bankingDetails} />
          <DetailRow label="FI Report" value={review.fiReport} isLast />
        </Card>

        <Card style={styles.section}>
          <SectionTitle title="Eligibility & Product" />
          <DetailRow label="EMI Eligibility" value={review.emiEligibility} />
          <DetailRow label="Repayment Capacity" value={review.repaymentCapacity} />
          <DetailRow label="Selected Product" value={review.selectedProduct} />
          <DetailRow label="Product Margin" value={review.productMargin} />
          <DetailRow label="Risk Category" value={review.riskCategory} />
          {review.recommendedProduct ? (
            <DetailRow label="Recommended Product" value={review.recommendedProduct} />
          ) : null}
          <DetailRow label="Remarks" value={review.remarks} isLast />
        </Card>

        <Card style={styles.section}>
          <SectionTitle title="Financial Review" />
          <DetailRow
            label="Default Down Payment"
            value={formatCurrencyAmount(defaults.downPaymentAmount)}
          />
          <DetailRow
            label="Approved Down Payment"
            value={formatCurrencyAmount(approved.downPaymentAmount)}
          />
          <DetailRow
            label="Default Interest Rate"
            value={formatPercent(defaults.interestRatePercent)}
          />
          <DetailRow
            label="Approved Interest Rate"
            value={formatPercent(approved.interestRatePercent)}
          />
          <DetailRow
            label="Default EMI Tenure"
            value={formatTenureMonths(defaults.emiTenureMonths)}
          />
          <DetailRow
            label="Approved EMI Tenure"
            value={formatTenureMonths(approved.emiTenureMonths)}
          />
          <DetailRow
            label="Default Processing Fee"
            value={formatCurrencyAmount(defaults.processingFee)}
          />
          <DetailRow
            label="Approved Processing Fee"
            value={formatCurrencyAmount(approved.processingFee)}
          />
          <DetailRow
            label="Default Service Charges"
            value={formatCurrencyAmount(defaults.serviceCharges)}
          />
          <DetailRow
            label="Approved Service Charges"
            value={formatCurrencyAmount(approved.serviceCharges)}
          />
          <DetailRow
            label="Default Other Charges"
            value={formatCurrencyAmount(defaults.otherCharges)}
          />
          <DetailRow
            label="Approved Other Charges"
            value={formatCurrencyAmount(approved.otherCharges)}
          />
          <DetailRow label="Default EMI Plan" value={defaults.emiPlan} />
          <DetailRow label="Approved EMI Plan" value={approved.emiPlan} isLast />

          <Text style={styles.overrideHeading}>Override Details</Text>
          <DetailRow
            label="Override Status"
            value={
              overrideRecord.overrideStatus === 'Not Overridden'
                ? 'No Override Applied'
                : overrideRecord.overrideStatus
            }
          />
          <DetailRow
            label="Default Down Payment Amount"
            value={formatCurrencyAmount(defaults.downPaymentAmount)}
          />
          <DetailRow
            label="Approved Down Payment Amount"
            value={formatCurrencyAmount(approved.downPaymentAmount)}
          />
          <DetailRow label="Override Reason" value={overrideRecord.overrideReason} />
          <DetailRow label="Approved By" value={overrideRecord.approvedBy} />
          <DetailRow
            label="Override Date & Time"
            value={formatOverrideDateTime(overrideRecord.overrideDateTime)}
            isLast
          />

          <Text style={styles.overrideHeading}>Customer-Specific Override (Authorized)</Text>
          <Text style={styles.overrideHint}>
            Edit Approved Values only. Defaults stay unchanged and apply only to this application.
          </Text>

          <Input
            label="Approved Down Payment Amount (₹)"
            placeholder="e.g. 30000"
            value={approvedDownPayment}
            onChangeText={(v) => setApprovedDownPayment(v.replace(/[^0-9.]/g, ''))}
            keyboardType="numeric"
            hint={`Product Price ${formatCurrencyAmount(productPrice)} · Loan Amount ${formatCurrencyAmount(loanAmount)}`}
          />
          <Input
            label="Approved Interest Rate (%)"
            placeholder="e.g. 14"
            value={approvedInterestRate}
            onChangeText={(v) => setApprovedInterestRate(v.replace(/[^0-9.]/g, ''))}
            keyboardType="numeric"
          />
          <Input
            label="Approved EMI Tenure (Months)"
            placeholder="e.g. 12"
            value={approvedTenure}
            onChangeText={(v) => setApprovedTenure(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />
          <Input
            label="Approved Processing Fee (₹)"
            placeholder="e.g. 999"
            value={approvedProcessingFee}
            onChangeText={(v) => setApprovedProcessingFee(v.replace(/[^0-9.]/g, ''))}
            keyboardType="numeric"
          />
          <Input
            label="Approved Service Charges (₹)"
            placeholder="e.g. 499"
            value={approvedServiceCharges}
            onChangeText={(v) => setApprovedServiceCharges(v.replace(/[^0-9.]/g, ''))}
            keyboardType="numeric"
          />
          <Input
            label="Approved Other Charges (₹)"
            placeholder="e.g. 0"
            value={approvedOtherCharges}
            onChangeText={(v) => setApprovedOtherCharges(v.replace(/[^0-9.]/g, ''))}
            keyboardType="numeric"
          />
          <Dropdown
            label="Approved EMI Plan"
            placeholder="Select EMI plan"
            value={approvedEmiPlan}
            options={emiPlanOptions}
            onSelect={setApprovedEmiPlan}
          />
          <Input
            label="Override Reason"
            placeholder="Enter reason for override"
            value={overrideReason}
            onChangeText={setOverrideReason}
            multiline
          />
          <Button
            title="Apply Financial Override"
            variant="outline"
            onPress={handleApplyOverride}
            style={styles.overrideBtn}
          />
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.footerActions}>
          <Button title="Approve" variant="success" size="sm" onPress={handleApprove} style={styles.actionBtn} />
          <Button title="Reject" variant="danger" size="sm" onPress={handleReject} style={styles.actionBtn} />
          <Button title="Hold" variant="outline" size="sm" onPress={handleHold} style={styles.actionBtn} />
          <Button
            title="Request Documents"
            variant="secondary"
            size="sm"
            onPress={handleRequestDocuments}
            style={styles.actionBtnWide}
          />
          <Button
            title="Recommend Alternate Product"
            variant="outline"
            size="sm"
            onPress={handleRecommendAlternate}
            style={styles.actionBtnWide}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
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
    overrideHeading: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textHeading,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    overrideHint: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: spacing.md,
    },
    overrideBtn: { marginTop: spacing.sm },
    footer: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    footerActions: {
      gap: spacing.sm,
      alignItems: 'center',
      paddingRight: spacing.md,
    },
    actionBtn: { minWidth: 100 },
    actionBtnWide: { minWidth: 170 },
    notFound: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      gap: spacing.lg,
    },
    notFoundText: { fontSize: 16, color: colors.textSecondary },
    backAction: { minWidth: 140 },
  });
}
