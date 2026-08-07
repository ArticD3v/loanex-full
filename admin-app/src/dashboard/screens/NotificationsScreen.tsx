import React, { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NotificationItem } from '../components/NotificationItem';
import {
  getNotifications,
  getUnreadCount,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
} from '../data/notificationStore';
import { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/useTheme';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

export function NotificationsScreen({ navigation }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const notifications = useSyncExternalStore(
    subscribeNotifications,
    getNotifications,
    getNotifications,
  );
  const unreadCount = useSyncExternalStore(
    subscribeNotifications,
    getUnreadCount,
    getUnreadCount,
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
      loadNotifications();
      return () => subscription.remove();
    }, [handleGoBack]),
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerAction}>
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllNotificationsRead} hitSlop={8}>
              <Text style={styles.markAll}>Mark all read</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No notifications</Text>
          </View>
        ) : (
          notifications.map((item, index) => (
            <NotificationItem
              key={item.id}
              title={item.title}
              message={item.message}
              time={item.time}
              read={item.read}
              icon={item.icon}
              isLast={index === notifications.length - 1}
              onPress={() => {
                if (!item.read) markNotificationRead(item.id);
              }}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
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
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      ...typography.label,
      fontSize: 16,
      color: colors.textHeading,
    },
    headerAction: {
      minWidth: 40,
      alignItems: 'flex-end',
    },
    markAll: {
      ...typography.caption,
      color: colors.primary,
      fontWeight: '700',
      fontSize: 12,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
      gap: spacing.md,
    },
    emptyTitle: {
      ...typography.label,
      color: colors.textSecondary,
    },
  });
}
