import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { getNotifications, markAsRead, markAllAsRead } from '../services/notificationService';
import { Colors, Fonts, Spacing, Radius, Shadow } from '../constants/theme';
import { AppNotification } from '../types';

const TYPE_META: Record<string, { icon: string; color: string }> = {
  order: { icon: 'receipt-long', color: Colors.primary },
  emi: { icon: 'account-balance', color: '#7C3AED' },
  payment: { icon: 'payment', color: Colors.success },
  kyc: { icon: 'verified-user', color: '#2563EB' },
  general: { icon: 'notifications-none', color: Colors.textTertiary },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getNotifications(user.id);
    setNotifications(data);
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handlePress(n: AppNotification) {
    if (!n.read) {
      await markAsRead(n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
    if (n.route) router.push(n.route as any);
  }

  async function handleMarkAll() {
    if (!user) return;
    await markAllAsRead(user.id);
    setNotifications(prev => prev.map(x => ({ ...x, read: true })));
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 ? (
          <Pressable onPress={handleMarkAll}>
            <Text style={styles.markAll}>Mark all read</Text>
          </Pressable>
        ) : (
          <View style={{ width: 70 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="notifications-none" size={72} color={Colors.border} />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySub}>
            You'll see updates here when you place orders, get EMI approvals, complete KYC, or make payments.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const meta = TYPE_META[item.type] || TYPE_META.general;
            return (
              <Pressable
                style={[styles.item, !item.read && styles.itemUnread]}
                onPress={() => handlePress(item)}
              >
                <View style={[styles.iconWrap, { backgroundColor: meta.color + '18' }]}>
                  <MaterialIcons name={meta.icon as any} size={22} color={meta.color} />
                </View>
                <View style={styles.info}>
                  <View style={styles.titleRow}>
                    <Text style={styles.ntitle} numberOfLines={1}>{item.title}</Text>
                    {!item.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.nsub} numberOfLines={2}>{item.message}</Text>
                  <Text style={styles.ntime}>
                    {new Date(item.createdAt).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
                {item.route ? <MaterialIcons name="chevron-right" size={18} color={Colors.textTertiary} /> : null}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary, textAlign: 'center' },
  markAll: { fontSize: Fonts.sm, color: Colors.primary, fontWeight: Fonts.semiBold },
  list: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 },
  item: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md, ...Shadow.sm },
  itemUnread: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ntitle: { fontSize: Fonts.md, fontWeight: Fonts.semiBold, color: Colors.textPrimary, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  nsub: { fontSize: Fonts.sm, color: Colors.textSecondary, lineHeight: 18 },
  ntime: { fontSize: Fonts.xs, color: Colors.textTertiary, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.md },
  emptyTitle: { fontSize: Fonts.xl, fontWeight: Fonts.bold, color: Colors.textPrimary },
  emptySub: { fontSize: Fonts.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
