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
import { Customer, CustomerStatus, EmiStatus } from '../../types/customer';
import { colors } from '../../theme/colors';
import { radius, shadow, spacing } from '../../theme/spacing';

interface CustomerCardProps {
  customer: Customer;
  onView: () => void;
}

const PHOTO_SIZE = 84;

const EMI_STATUS_STYLE: Record<EmiStatus, { label: string; bg: string; text: string }> = {
  running: { label: 'Running', bg: colors.successLight, text: colors.success },
  pending: { label: 'Pending', bg: colors.warningLight, text: colors.warning },
  completed: { label: 'Completed', bg: colors.primaryLight, text: colors.primary },
  rejected: { label: 'Rejected', bg: colors.dangerLight, text: colors.danger },
};

const CUSTOMER_STATUS_STYLE: Record<CustomerStatus, { label: string; bg: string; text: string }> = {
  active: { label: 'Active', bg: colors.successLight, text: colors.success },
  inactive: { label: 'Inactive', bg: colors.borderLight, text: colors.textSecondary },
};

export function CustomerCard({ customer, onView }: CustomerCardProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const emiStatus = EMI_STATUS_STYLE[customer.emiStatus];
  const customerStatus = CUSTOMER_STATUS_STYLE[customer.status];

  return (
    <View style={[styles.card, shadow.sm, isTablet && styles.cardTablet]}>
      <View style={styles.content}>
        <View style={styles.thumb}>
          {customer.photoUrl ? (
            <Image source={{ uri: customer.photoUrl }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="person-outline" size={28} color={colors.textMuted} />
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={2}>
              {customer.name}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: customerStatus.bg }]}>
              <Text style={[styles.statusText, { color: customerStatus.text }]}>
                {customerStatus.label}
              </Text>
            </View>
          </View>

          <Text style={styles.metaLine} numberOfLines={1}>
            ID: {customer.id}
          </Text>

          <Text style={styles.metaLine} numberOfLines={1}>
            {customer.mobile}
          </Text>

          <Text style={styles.cityLine} numberOfLines={1}>
            {customer.city}
          </Text>

          <View style={styles.emiRow}>
            <Text style={styles.emiLabel}>Current EMI Status</Text>
            <View style={[styles.emiPill, { backgroundColor: emiStatus.bg }]}>
              <Text style={[styles.emiText, { color: emiStatus.text }]}>{emiStatus.label}</Text>
            </View>
          </View>
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
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
  danger?: boolean;
}) {
  const iconColor = danger ? colors.danger : primary ? colors.primary : colors.primary;
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={16} color={iconColor} />
      <Text
        style={[
          styles.actionLabel,
          primary && styles.actionLabelPrimary,
          danger && styles.actionLabelDanger,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 160,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
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
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    resizeMode: 'cover',
  },
  photoPlaceholder: {
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
  name: {
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
  metaLine: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cityLine: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
    fontWeight: '500',
  },
  emiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    gap: spacing.sm,
  },
  emiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  emiPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  emiText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
    color: colors.primary,
  },
  actionLabelDanger: {
    color: colors.danger,
  },
  actionDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.borderLight,
  },
});
