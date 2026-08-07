import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { EmiApplication, EmiApplicationStatus } from '../../types/emiApplication';
import { colors } from '../../theme/colors';
import { radius, shadow, spacing } from '../../theme/spacing';

interface EmiApplicationCardProps {
  application: EmiApplication;
  onView: () => void;
}

const STATUS_STYLE: Record<EmiApplicationStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pending', bg: colors.warningLight, text: colors.warning },
  under_review: { label: 'Under Review', bg: colors.primaryLight, text: colors.primary },
  approved: { label: 'Approved', bg: colors.successLight, text: colors.success },
  rejected: { label: 'Rejected', bg: colors.dangerLight, text: colors.danger },
  hold: { label: 'Hold', bg: colors.accentLight, text: colors.accentDark },
};

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

export function EmiApplicationCard({ application, onView }: EmiApplicationCardProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const status = STATUS_STYLE[application.status];

  return (
    <View style={[styles.card, shadow.sm, isTablet && styles.cardTablet]}>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.applicationId} numberOfLines={1}>
            {application.id}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>

        <Text style={styles.customerName} numberOfLines={1}>
          {application.customerName}
        </Text>

        <Text style={styles.metaLine} numberOfLines={1}>
          {application.mobile}
        </Text>

        <Text style={styles.productName} numberOfLines={2}>
          {application.selectedProduct}
        </Text>

        <View style={styles.amountRow}>
          <Text style={styles.amount}>{formatAmount(application.requestedLoanAmount)}</Text>
          <Text style={styles.emiPlan} numberOfLines={1}>
            {application.emiPlan}
          </Text>
        </View>

        <Text style={styles.dateLine} numberOfLines={1}>
          {formatDate(application.applicationDate)}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onView} activeOpacity={0.7}>
          <Ionicons name="eye-outline" size={16} color={colors.primary} />
          <Text style={styles.actionLabel}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 160,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardTablet: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  content: {
    padding: spacing.md,
    gap: 4,
    minHeight: 116,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  applicationId: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textHeading,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginTop: 1,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  customerName: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    fontWeight: '600',
  },
  metaLine: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  productName: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    gap: spacing.sm,
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  emiPlan: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'right',
  },
  dateLine: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    minHeight: 48,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
  },
  actionEmoji: {
    fontSize: 14,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
