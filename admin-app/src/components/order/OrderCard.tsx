import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Order, OrderStatus, PAYMENT_TYPE_LABEL } from '../../types/order';
import { colors } from '../../theme/colors';
import { radius, shadow, spacing } from '../../theme/spacing';

interface OrderCardProps {
  order: Order;
  onView: () => void;
}

const IMAGE_SIZE = 84;

const ORDER_STATUS_STYLE: Record<OrderStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pending', bg: colors.warningLight, text: colors.warning },
  confirmed: { label: 'Confirmed', bg: colors.primaryLight, text: colors.primary },
  approved: { label: 'Approved', bg: colors.secondaryLight, text: colors.secondary },
  processing: { label: 'Processing', bg: colors.primaryLight, text: colors.primaryDark },
  packed: { label: 'Packed', bg: colors.accentLight, text: colors.accentDark },
  shipped: { label: 'Shipped', bg: colors.primaryLight, text: colors.primaryDark },
  out_for_delivery: { label: 'Out for Delivery', bg: colors.accentLight, text: colors.accentDark },
  delivered: { label: 'Delivered', bg: colors.successLight, text: colors.success },
  cancelled: { label: 'Cancelled', bg: colors.dangerLight, text: colors.danger },
};

function formatAmount(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Loan-health badges shown on EMI order rows so approvers can see loan
 * status, installments paid and outstanding balance without opening the order.
 */
const LOAN_STATUS_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  ACTIVE: { label: 'EMI Active', bg: '#0596691A', text: '#059669' },
  CLOSED: { label: 'Loan Closed', bg: '#6B72801A', text: '#6B7280' },
  OVERDUE: { label: 'Overdue', bg: '#DC26261A', text: '#DC2626' },
  PENDING: { label: 'Pending', bg: '#D977061A', text: '#D97706' },
};

function loanStatusStyle(status?: string | null) {
  const key = String(status ?? '').toUpperCase();
  return LOAN_STATUS_STYLE[key] ?? {
    label: key ? key.charAt(0) + key.slice(1).toLowerCase() : 'Loan',
    bg: colors.primaryLight,
    text: colors.primaryDark,
  };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function OrderCard({ order, onView }: OrderCardProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const status = ORDER_STATUS_STYLE[order.status];

  return (
    <View style={[styles.card, shadow.sm, isTablet && styles.cardTablet]}>
      <View style={styles.content}>
        <View style={styles.thumb}>
          {order.productImageUrl ? (
            <Image source={{ uri: order.productImageUrl }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="cube-outline" size={28} color={colors.textMuted} />
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.orderId} numberOfLines={1}>
              {order.id}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
            </View>
          </View>

          <Text style={styles.customerName} numberOfLines={1}>
            {order.customerName}
          </Text>

          <Text style={styles.productName} numberOfLines={2}>
            {order.productName}
          </Text>

          <Text style={styles.metaLine} numberOfLines={1}>
            {formatDate(order.orderDate)}
          </Text>

          <View style={styles.amountRow}>
            <Text style={styles.amount}>{formatAmount(order.orderAmount)}</Text>
            <Text style={styles.paymentType}>{PAYMENT_TYPE_LABEL[order.paymentType]}</Text>
          </View>

          {/* ── Loan health (EMI orders) ─────────────────────────────── */}
          {(order.loanStatus || (order.paidEmiCount ?? 0) > 0 || (order.totalEmiCount ?? 0) > 0) && (
            <View style={styles.loanRow}>
              {order.loanStatus && (
                <View
                  style={[
                    styles.loanBadge,
                    { backgroundColor: loanStatusStyle(order.loanStatus).bg },
                  ]}
                >
                  <Text style={[styles.loanBadgeText, { color: loanStatusStyle(order.loanStatus).text }]}>
                    {loanStatusStyle(order.loanStatus).label}
                  </Text>
                </View>
              )}
              {order.totalEmiCount ? (
                <Text style={styles.loanMeta}>
                  {order.paidEmiCount ?? 0}/{order.totalEmiCount} installments paid
                </Text>
              ) : null}
              {typeof order.outstandingAmount === 'number' && order.outstandingAmount > 0 ? (
                <Text style={[styles.loanMeta, styles.loanOutstanding]}>
                  {formatAmount(order.outstandingAmount)} outstanding
                </Text>
              ) : order.loanStatus === 'CLOSED' ? (
                <Text style={[styles.loanMeta, styles.loanClosed]}>Fully paid</Text>
              ) : null}
            </View>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <ActionBtn icon="eye-outline" label="View" onPress={onView} />
      </View>
    </View>
  );
}

function ActionBtn({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={[styles.actionLabel, primary && styles.actionLabelPrimary]}>{label}</Text>
    </TouchableOpacity>
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
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
    minHeight: 116,
  },
  thumb: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  body: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  orderId: {
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
  productName: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  metaLine: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
    fontWeight: '500',
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
  paymentType: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.3,
    textAlign: 'right',
    flexShrink: 1,
  },
  loanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  loanBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  loanBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  loanMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  loanOutstanding: {
    color: colors.warning,
  },
  loanClosed: {
    color: colors.success,
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
  actionLabelPrimary: {
    color: colors.secondary,
  },
  actionDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.borderLight,
  },
});
