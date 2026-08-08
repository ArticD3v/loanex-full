import React, { useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMe, User } from '../../services/authService';
import { useTheme } from '../../theme/useTheme';
import { radius, shadow, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface ProfileMenuProps {
  visible: boolean;
  onClose: () => void;
  onMyProfile: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
}

export function ProfileMenu({
  visible,
  onClose,
  onMyProfile,
  onChangePassword,
  onLogout,
}: ProfileMenuProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [profile, setProfile] = React.useState<User | null>(null);

  React.useEffect(() => {
    getMe().then(setProfile).catch(() => {});
  }, []);

  const menuItems = [
    {
      key: 'profile',
      label: 'My Profile',
      icon: 'person-outline' as const,
      onPress: onMyProfile,
      danger: false,
    },
    {
      key: 'password',
      label: 'Change Password',
      icon: 'lock-closed-outline' as const,
      onPress: onChangePassword,
      danger: false,
    },
    {
      key: 'logout',
      label: 'Logout',
      icon: 'log-out-outline' as const,
      onPress: onLogout,
      danger: true,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, shadow.lg]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile?.email ? profile.email.charAt(0).toUpperCase() : 'A'}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{profile?.email || profile?.phone || 'Admin'}</Text>
              <Text style={styles.userRole}>{profile?.role ? profile.role.toUpperCase() : 'ADMIN'}</Text>
            </View>
          </View>

          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && styles.menuItemLast,
              ]}
              onPress={() => {
                onClose();
                item.onPress();
              }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.menuIcon,
                  item.danger && styles.menuIconDanger,
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={item.danger ? colors.danger : colors.primary}
                />
              </View>
              <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>
                {item.label}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={item.danger ? colors.danger : colors.textMuted}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.xxl,
      paddingBottom: spacing.xxxl,
      paddingTop: spacing.md,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.xl,
      paddingBottom: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      ...typography.label,
      color: colors.textOnPrimary,
      fontWeight: '700',
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      ...typography.subtitle,
      color: colors.textHeading,
      marginBottom: 2,
    },
    userRole: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      gap: spacing.md,
    },
    menuItemLast: {
      borderBottomWidth: 0,
    },
    menuIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuIconDanger: {
      backgroundColor: colors.dangerLight,
    },
    menuLabel: {
      ...typography.label,
      color: colors.text,
      flex: 1,
      fontSize: 15,
    },
    menuLabelDanger: {
      color: colors.danger,
    },
  });
}
