import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
  MODULES,
  ACTION_KEYS,
  ACTION_LABELS,
  ActionKey,
  Role,
  permissionKey,
} from '../../types/role';
import { getRoleById, createRole, updateRole } from '../../services/roleService';
import { colors } from '../../theme/colors';
import { radius, shadow, spacing } from '../../theme/spacing';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RoleForm'>;

function PermissionChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.permChip, active && styles.permChipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.permChipText, active && styles.permChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function RoleFormScreen({ navigation, route }: Props) {
  const isEditMode = route.params?.mode === 'edit';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isSystem, setIsSystem] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditMode && route.params?.roleId) {
      getRoleById(route.params.roleId)
        .then((role: Role | undefined) => {
          if (role) {
            setName(role.name);
            setDescription(role.description ?? '');
            setPermissions(role.permissions);
            setIsSystem(role.isSystem);
          }
        })
        .catch((error) => console.error('Error loading role:', error))
        .finally(() => setLoading(false));
    }
  }, [isEditMode, route.params?.roleId]);

  const togglePermission = (key: string) => {
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    );
  };

  const toggleModuleAll = (moduleKey: string) => {
    const modulePerms = ACTION_KEYS.map((action) => permissionKey(moduleKey as any, action));
    const allActive = modulePerms.every((p) => permissions.includes(p));
    setPermissions((prev) =>
      allActive
        ? prev.filter((p) => !modulePerms.includes(p))
        : Array.from(new Set([...prev, ...modulePerms])),
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrors({ name: 'Role name is required' });
      Alert.alert('Validation Error', 'Please enter a role name.');
      return;
    }

    try {
      setSaving(true);
      if (isEditMode && route.params?.roleId) {
        await updateRole(route.params.roleId, {
          name: name.trim(),
          description: description.trim(),
          permissions,
        });
      } else {
        await createRole({
          name: name.trim(),
          description: description.trim(),
          permissions,
        });
      }
      Alert.alert(
        isEditMode ? 'Role Updated' : 'Role Created',
        `“${name.trim()}” has been saved.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      Alert.alert('Save Failed', error?.message || 'Could not save the role.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Role Details</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading role...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{isEditMode ? 'Edit Role' : 'Add Role'}</Text>
            <Text style={styles.headerSubtitle}>
              {isEditMode ? 'Adjust permissions for this role' : 'Create a new role with custom access'}
            </Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        {isSystem ? (
          <View style={styles.systemBanner}>
            <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
            <Text style={styles.systemBannerText}>
              The Super Admin role is protected and cannot be modified.
            </Text>
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, shadow.sm]}>
            <Text style={styles.sectionHeading}>Role Details</Text>
            <Input
              label="Role Name"
              required
              value={name}
              onChangeText={(text) => {
                setName(text);
                setErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="e.g. Product Manager"
              editable={!isSystem}
              error={errors.name}
              autoCapitalize="words"
            />
            <Input
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="What can users with this role do?"
              editable={!isSystem}
              multiline
            />
          </View>

          <View style={[styles.card, shadow.sm]}>
            <View style={styles.permHeader}>
              <Text style={styles.sectionHeading}>Permissions</Text>
              <Text style={styles.permCount}>{permissions.length} selected</Text>
            </View>
            <Text style={styles.permHint}>
              Grant or deny access per module. A user can only do what their role allows.
            </Text>

            {MODULES.map((module) => {
              const modulePerms = ACTION_KEYS.map((action) =>
                permissionKey(module.key, action),
              );
              const allActive = modulePerms.every((p) => permissions.includes(p));
              return (
                <View key={module.key} style={styles.moduleRow}>
                  <View style={styles.moduleInfo}>
                    <Text style={styles.moduleName}>{module.label}</Text>
                    <Text style={styles.moduleDesc} numberOfLines={1}>
                      {module.description}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => toggleModuleAll(module.key)} activeOpacity={0.8}>
                    <Text style={[styles.selectAll, allActive && styles.selectAllActive]}>
                      {allActive ? 'All' : 'Select all'}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.permRow}>
                    {ACTION_KEYS.map((action: ActionKey) => {
                      const key = permissionKey(module.key, action);
                      const active = permissions.includes(key);
                      return (
                        <PermissionChip
                          key={key}
                          label={ACTION_LABELS[action]}
                          active={active}
                          onPress={() => !isSystem && togglePermission(key)}
                        />
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {!isSystem ? (
          <View style={[styles.footer, shadow.md]}>
            <Button
              title="Cancel"
              onPress={() => navigation.goBack()}
              variant="outline"
              style={styles.footerBtn}
            />
            <Button
              title={isEditMode ? 'Save Changes' : 'Create Role'}
              onPress={handleSave}
              loading={saving}
              variant="primary"
              style={styles.footerBtn}
            />
          </View>
        ) : (
          <View style={[styles.footer, shadow.md]}>
            <Button
              title="Back"
              onPress={() => navigation.goBack()}
              variant="outline"
              style={styles.footerBtn}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
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
    headerSubtitle: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 2,
    },
    systemBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.primaryLight,
      padding: spacing.md,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      borderRadius: radius.md,
    },
    systemBannerText: { flex: 1, fontSize: 13, color: colors.textSecondary },
    content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    sectionHeading: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textHeading,
      marginBottom: spacing.sm,
    },
    permHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    permCount: { fontSize: 12, fontWeight: '700', color: colors.primary },
    permHint: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: spacing.md,
      lineHeight: 17,
    },
    moduleRow: {
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    moduleInfo: { marginBottom: spacing.sm },
    moduleName: { fontSize: 14, fontWeight: '700', color: colors.textHeading },
    moduleDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    selectAll: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: spacing.sm,
      alignSelf: 'flex-end',
    },
    selectAllActive: { color: colors.primary },
    permRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    permChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.background,
      minWidth: 68,
      alignItems: 'center',
    },
    permChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    permChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    permChipTextActive: { color: colors.primary, fontWeight: '700' },
    footer: {
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    footerBtn: { flex: 1 },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    },
    loadingText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  });

