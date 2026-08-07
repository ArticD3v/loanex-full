import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';

interface ExpandableCardProps {
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
}

export function ExpandableCard({
  title,
  subtitle,
  expanded,
  onToggle,
  badge,
  badgeColor,
  children,
}: ExpandableCardProps) {
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.header} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: badgeColor || colors.primaryLight }]}>
            <Text style={[styles.badgeText, { color: badgeColor ? '#FFF' : colors.primary }]}>{badge}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.borderLight,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.sm },
  chevron: { fontSize: 14, color: colors.textSecondary, width: 16 },
  titleWrap: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  body: { padding: spacing.lg },
});
