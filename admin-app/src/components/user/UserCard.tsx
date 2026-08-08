import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppUser, UserStatus } from '../../types/user';
import { colors } from '../../theme/colors';
import { radius, shadow, spacing } from '../../theme/spacing';

interface UserCardProps {
  user: AppUser;
  onView: () => void;
  /** Hidden when the logged-in user lacks users.edit. */
  onEdit?: () => void;
}

const STATUS_STYLE: Record<UserStatus, { label: string; bg: string; text: string }> = {
  active: { label: 'Active', bg: colors.successLight, text: colors.success },
  inactive: { label: 'Inactive', bg: colors.borderLight, text: colors.textSecondary },
};

export function UserCard({ user, onView, onEdit }: UserCardProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const status = user.blocked
    ? { label: 'Blocked', bg: colors.dangerLight, text: colors.danger }
    : STATUS_STYLE[user.status];

  return (
    <View style={[styles.card, shadow.sm, isTablet && styles.cardTablet]}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={28} color={colors.textMuted} />
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {user.name}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
            </View>
          </View>

          <Text style={styles.role} numberOfLines={1}>
            {user.role}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {user.email}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {user.mobile}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onView} activeOpacity={0.7}>
          <Ionicons name="eye-outline" size={18} color={colors.primary} />
          <Text style={styles.actionLabel}>View</Text>
        </TouchableOpacity>
        {onEdit ? (
          <>
            <View style={styles.actionDivider} />
            <TouchableOpacity style={styles.actionBtn} onPress={onEdit} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={18} color={colors.accentDark} />
              <Text style={[styles.actionLabel, styles.actionLabelPrimary]}>Edit</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardTablet: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  content: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  body: { flex: 1, gap: 2 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textHeading,
  },
  statusPill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  role: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  actionDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  actionLabelPrimary: {
    color: colors.accentDark,
  },
});
