import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  BackHandler,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Role } from '../../types/role';
import { getRoles, deleteRole } from '../../services/roleService';
import { useRbac, can } from '../../auth/rbacStore';
import { colors } from '../../theme/colors';
import { radius, shadow, spacing } from '../../theme/spacing';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RoleList'>;

export function RoleListScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const numColumns = isTablet ? 2 : 1;
  const rbac = useRbac();

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const canEdit = can('roles.edit');
  const canDelete = can('roles.delete');

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setRoles(await getRoles());
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRoles();
    }, [fetchRoles]),
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
      return () => subscription.remove();
    }, [handleGoBack]),
  );

  const handleDelete = (role: Role) => {
    Alert.alert(
      'Delete Role',
      `Delete the "${role.name}" role? Users assigned to this role must be reassigned first.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(role.id);
              await deleteRole(role.id);
              setRoles((prev) => prev.filter((r) => r.id !== role.id));
            } catch (error: any) {
              Alert.alert(
                'Cannot Delete Role',
                error?.message || 'This role could not be deleted.',
              );
            } finally {
              setDeleting(null);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Role }) => (
    <View style={[styles.roleCard, shadow.sm]}>
      <View style={styles.roleHeader}>
        <View style={styles.roleIconWrap}>
          <Ionicons
            name={item.isSystem ? 'shield-checkmark' : 'shield-outline'}
            size={20}
            color={item.isSystem ? colors.primary : colors.textSecondary}
          />
        </View>
        <View style={styles.roleTitleWrap}>
          <View style={styles.roleTitleRow}>
            <Text style={styles.roleName}>{item.name}</Text>
            {item.isSystem ? (
              <View style={styles.systemBadge}>
                <Text style={styles.systemBadgeText}>SYSTEM</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.roleDesc} numberOfLines={2}>
            {item.description || 'No description'}
          </Text>
        </View>
      </View>

      <View style={styles.roleMeta}>
        <View style={styles.metaItem}>
          <Text style={styles.metaValue}>{item.permissions.length}</Text>
          <Text style={styles.metaLabel}>Permissions</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaItem}>
          <Text style={styles.metaValue}>{item.userCount ?? 0}</Text>
          <Text style={styles.metaLabel}>Users</Text>
        </View>
      </View>

      <View style={styles.roleActions}>
        {canEdit && !item.isSystem ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionEdit]}
            onPress={() => navigation.navigate('RoleForm', { mode: 'edit', roleId: item.id })}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={styles.actionEditText}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionSpacer} />
        )}
        {canDelete && !item.isSystem ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionDelete]}
            onPress={() => handleDelete(item)}
            disabled={deleting === item.id}
            activeOpacity={0.8}
          >
            <Ionicons
              name={deleting === item.id ? 'hourglass-outline' : 'trash-outline'}
              size={16}
              color={colors.danger}
            />
            <Text style={styles.actionDeleteText}>Delete</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Roles & Permissions</Text>
          <Text style={styles.headerCount}>{roles.length} Roles</Text>
        </View>
        {can('roles.create') ? (
          <TouchableOpacity
            style={[styles.addBtn, shadow.sm]}
            onPress={() => navigation.navigate('RoleForm', { mode: 'add' })}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.addBtnText}>Add Role</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
      </View>

      <View style={styles.hintWrap}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
        <Text style={styles.hintText}>
          Roles control what each admin can see and do. Create a role like
          “Product Manager” with only product permissions, then assign it when
          adding a user.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading roles...</Text>
        </View>
      ) : (
        <FlatList
          key={numColumns}
          data={roles}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={numColumns}
          contentContainerStyle={styles.list}
          columnWrapperStyle={isTablet ? styles.columnWrapper : undefined}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="shield-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No roles found</Text>
              <Text style={styles.emptyDesc}>
                Create your first role to start assigning access.
              </Text>
            </View>
          }
        />
      )}
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
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textHeading },
  headerCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  addBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  hintWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  columnWrapper: { gap: spacing.lg },
  roleCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  roleHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  roleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTitleWrap: { flex: 1 },
  roleTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  roleName: { fontSize: 16, fontWeight: '700', color: colors.textHeading },
  systemBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  systemBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  roleDesc: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 18 },
  roleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  metaItem: { flex: 1, alignItems: 'center' },
  metaValue: { fontSize: 16, fontWeight: '800', color: colors.textHeading },
  metaLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  metaDivider: { width: 1, height: 24, backgroundColor: colors.border },
  roleActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionSpacer: { flex: 1 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  actionEdit: { borderColor: colors.primary },
  actionEditText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  actionDelete: { borderColor: colors.danger },
  actionDeleteText: { fontSize: 13, fontWeight: '700', color: colors.danger },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 2,
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textHeading },
  emptyDesc: { fontSize: 14, color: colors.textSecondary },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: spacing.md,
  },
  loadingText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
});
