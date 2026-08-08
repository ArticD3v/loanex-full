import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  BackHandler,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DetailRow } from '../../components/ui/DetailRow';
import { SectionTitle } from '../../components/ui/SectionTitle';
import {
  getUserById,
  setUserBlocked,
  updateUserAccess,
  getUserLoginHistory,
  getUserActivityLog,
} from '../../services/userService';
import { AppUser, UserLoginEntry, UserActivityEntry } from '../../types/user';
import { useRbac, can } from '../../auth/rbacStore';
import { useMasterData, activeNames } from '../../settings/context/MasterDataContext';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'UserDetails'>;

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MultiSelectChips({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
      return;
    }
    onChange([...selected, option]);
  };

  return (
    <View style={chipStyles.wrap}>
      <Text style={chipStyles.label}>{label}</Text>
      <View style={chipStyles.row}>
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <TouchableOpacity
              key={option}
              style={[chipStyles.chip, active && chipStyles.chipActive]}
              onPress={() => toggle(option)}
              activeOpacity={0.8}
            >
              <Text style={[chipStyles.chipText, active && chipStyles.chipTextActive]}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  wrap: { marginTop: spacing.md },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textHeading,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.primary },
});

export function UserDetailsScreen({ navigation, route }: Props) {
  const userId = route.params.userId;
  const master = useMasterData();
  const rbac = useRbac();

  const [user, setUser] = useState<AppUser | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<string[]>([]);
  const [pincodes, setPincodes] = useState<string[]>([]);
  const [loginHistory, setLoginHistory] = useState<UserLoginEntry[]>([]);
  const [activityLog, setActivityLog] = useState<UserActivityEntry[]>([]);

  const branchOptions = useMemo(() => {
    const active = activeNames(master.branches);
    return Array.from(new Set([...active, ...branches]));
  }, [master.branches, branches]);

  const pincodeOptions = useMemo(() => {
    const active = master.pincodes
      .filter((p) => p.status === 'active')
      .map((p) => p.pincode);
    return Array.from(new Set([...active, ...pincodes]));
  }, [master.pincodes, pincodes]);

  const fetchUserDetails = useCallback(async () => {
    try {
      setLoading(true);
      const foundUser = await getUserById(userId);
      setUser(foundUser);
      if (foundUser) {
        setBranches([...foundUser.branches]);
        setPincodes([...foundUser.pincodes]);
      }
      const history = await getUserLoginHistory(userId);
      setLoginHistory(history);
      const activity = await getUserActivityLog(userId);
      setActivityLog(activity);
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchUserDetails();
    }, [fetchUserDetails])
  );

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('UserList');
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Details</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.notFound}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.notFoundText}>Loading user details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Details</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>User not found</Text>
          <Button title="Back" variant="outline" onPress={handleGoBack} style={styles.backAction} />
        </View>
      </SafeAreaView>
    );
  }

  const handleBlockToggle = () => {
    const nextBlocked = !user.blocked;
    Alert.alert(
      nextBlocked ? 'Block User' : 'Unblock User',
      nextBlocked
        ? `Block ${user.name}? They will not be able to log in.`
        : `Unblock ${user.name}? They will regain access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextBlocked ? 'Block' : 'Unblock',
          style: nextBlocked ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await setUserBlocked(user.id, nextBlocked);
              setUser({ ...user, blocked: nextBlocked });
              Alert.alert(
                'Updated',
                nextBlocked ? 'User blocked.' : 'User unblocked.',
              );
            } catch (error: any) {
              Alert.alert('Update Failed', error?.message || 'Could not update blocked state.');
            }
          },
        },
      ],
    );
  };

  const handlePasswordReset = () => {
    Alert.alert(
      'Password Reset',
      `Send a password reset link to ${user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Link',
          onPress: () =>
            Alert.alert(
              'Reset Link Sent',
              `Password reset link sent to ${user.email}.`,
            ),
        },
      ],
    );
  };

  const handleSaveAccess = async () => {
    try {
      await updateUserAccess(user.id, { branches, pincodes });
      Alert.alert('Access Updated', 'Branch and pincode mapping saved.');
    } catch (error: any) {
      Alert.alert('Update Failed', error?.message || 'Could not save access mapping.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card style={styles.section}>
          <SectionTitle title="User Information" />
          <DetailRow label="User ID" value={user.id} />
          <DetailRow label="Name" value={user.name} />
          <DetailRow label="Email" value={user.email} />
          <DetailRow label="Mobile" value={user.mobile} />
          <DetailRow label="Role" value={user.role} />
          <DetailRow label="Status" value={user.status === 'active' ? 'Active' : 'Inactive'} />
          <DetailRow
            label="Access"
            value={user.blocked ? 'Blocked' : 'Allowed'}
            isLast
          />
        </Card>

        <Card style={styles.section}>
          <SectionTitle title="Account Actions" />
          <View style={styles.actionStack}>
            <Button
              title={user.blocked ? 'Unblock User' : 'Block User'}
              variant={user.blocked ? 'success' : 'danger'}
              onPress={handleBlockToggle}
            />
            {can('users.edit') ? (
              <Button
                title="Edit User / Role"
                variant="secondary"
                onPress={() =>
                  navigation.navigate('AddUser', { mode: 'edit', userId: user.id })
                }
              />
            ) : null}
          </View>
        </Card>

        <Card style={styles.section}>
          <SectionTitle title="Branch-wise Access" />
          <MultiSelectChips
            label="Assigned Branches"
            options={branchOptions}
            selected={branches}
            onChange={setBranches}
          />
        </Card>

        <Card style={styles.section}>
          <SectionTitle title="Pincode-wise Mapping" />
          <MultiSelectChips
            label="Assigned Pincodes"
            options={pincodeOptions}
            selected={pincodes}
            onChange={setPincodes}
          />
          <Button
            title="Save Access Mapping"
            variant="outline"
            onPress={handleSaveAccess}
            style={styles.saveAccessBtn}
          />
        </Card>

        <Card style={styles.section}>
          <SectionTitle title="Login History" />
          {loginHistory.map((entry, index) => (
            <View
              key={entry.id}
              style={[styles.historyItem, index === loginHistory.length - 1 && styles.historyLast]}
            >
              <DetailRow label="Time" value={formatDateTime(entry.timestamp)} />
              <DetailRow label="Device" value={entry.device} />
              <DetailRow label="IP Address" value={entry.ipAddress} />
              <DetailRow label="Location" value={entry.location} />
              <DetailRow label="Status" value={entry.status} isLast />
            </View>
          ))}
        </Card>

        <Card style={styles.section}>
          <SectionTitle title="Activity Tracking" />
          {activityLog.map((entry, index) => (
            <View
              key={entry.id}
              style={[styles.historyItem, index === activityLog.length - 1 && styles.historyLast]}
            >
              <DetailRow label="Time" value={formatDateTime(entry.timestamp)} />
              <DetailRow label="Action" value={entry.action} />
              <DetailRow label="Module" value={entry.module} />
              <DetailRow label="Details" value={entry.details} isLast />
            </View>
          ))}
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Back" variant="outline" onPress={handleGoBack} style={styles.footerBtn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  actionStack: { gap: spacing.sm },
  saveAccessBtn: { marginTop: spacing.lg },
  historyItem: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  historyLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerBtn: { width: '100%' },
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
