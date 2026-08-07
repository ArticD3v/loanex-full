import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface NotificationItemProps {
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon: string;
  isLast?: boolean;
  onPress?: () => void;
}

export function NotificationItem({
  title,
  message,
  time,
  read,
  icon,
  isLast = false,
  onPress,
}: NotificationItemProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors, read, isLast), [colors, read, isLast]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={18}
          color={colors.primary}
        />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {!read ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.time}>{time}</Text>
          <Text style={[styles.status, !read && styles.statusUnread]}>
            {read ? 'Read' : 'Unread'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>, read: boolean, isLast: boolean) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: colors.borderLight,
      backgroundColor: read ? 'transparent' : colors.accentLight,
      borderRadius: read ? 0 : radius.sm,
      marginBottom: read ? 0 : spacing.xs,
      gap: spacing.md,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primaryLight,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: 2,
    },
    title: {
      ...typography.label,
      color: colors.text,
      flex: 1,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
    },
    message: {
      ...typography.caption,
      color: colors.textSecondary,
      lineHeight: 16,
      marginBottom: spacing.xs,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    time: {
      ...typography.caption,
      color: colors.textMuted,
      fontSize: 11,
    },
    status: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '600',
    },
    statusUnread: {
      color: colors.accentDark,
    },
  });
}
