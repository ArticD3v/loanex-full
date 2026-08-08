import React, { useCallback, useMemo, useState } from 'react';
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
import { findCreditReview, updateCreditReviewDecision } from '../data/creditReviewMockData';
import {
  getEmiApplicationById,
  approveEmiApplication,
  rejectEmiApplication,
  EmiApplication,
} from '../../services/emiService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DetailRow } from '../../components/ui/DetailRow';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { useTheme } from '../../theme/useTheme';
import { spacing } from '../../theme/spacing';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreditReviewDetails'>;

function formatDate(date: string) {
  if (!date || date === '—') return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function CreditReviewDetailsScreen({ navigation, route }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const applicationId = route.params.applicationId;
  const [review, setReview] = useState(() => findCreditReview(applicationId));
  const [application, setApplication] = useState<EmiApplication | null>(null);
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null);

  useFocusEffect(
    useCallback(() => {
      setReview(findCreditReview(applicationId));
      getEmiApplicationById(applicationId).then((app) => setApplication(app));
    }, [applicationId]),
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

  const handleApprove = useCallback(() => {
    Alert.alert('Approve', 'Approve this credit review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setSubmitting('approve');
          try {
            await approveEmiApplication(applicationId);
            const updated = updateCreditReviewDecision(applicationId, {
              decision: 'Approved',
              creditStatus: 'Completed',
              reviewDate: new Date().toISOString().slice(0, 10),
            });
            setReview(updated ? { ...updated } : undefined);
            Alert.alert('Application Approved', 'The EMI application has been approved.');
          } catch (error: any) {
            Alert.alert(
              'Approval Failed',
              error?.message || 'Something went wrong. Please try again.',
            );
          } finally {
            setSubmitting(null);
          }
        },
      },
    ]);
  }, [applicationId]);

  const handleReject = useCallback(() => {
    Alert.alert('Reject Application', 'Reject this EMI application?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setSubmitting('reject');
          try {
            await rejectEmiApplication(applicationId, 'Application rejected by admin.');
            const updated = updateCreditReviewDecision(applicationId, {
              decision: 'Rejected',
              creditStatus: 'Completed',
              reviewDate: new Date().toISOString().slice(0, 10),
              remarks: 'Application rejected by admin.',
            });
            setReview(updated ? { ...updated } : undefined);
            Alert.alert('Application Rejected', 'The EMI application has been rejected.');
          } catch (error: any) {
            Alert.alert(
              'Rejection Failed',
              error?.message || 'Something went wrong. Please try again.',
            );
          } finally {
            setSubmitting(null);
          }
        },
      },
    ]);
  }, [applicationId]);

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
      </ScrollView>

      <View style={styles.footer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.footerActions}>
          <Button
            title={submitting === 'approve' ? 'Approving...' : 'Approve'}
            variant="success"
            size="sm"
            disabled={submitting !== null}
            onPress={handleApprove}
            style={styles.actionBtn}
          />
          <Button
            title={submitting === 'reject' ? 'Rejecting...' : 'Reject'}
            variant="danger"
            size="sm"
            disabled={submitting !== null}
            onPress={handleReject}
            style={styles.actionBtn}
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
