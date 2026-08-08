import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Input } from '../../components/ui/Input';
import { Dropdown } from '../../components/ui/Dropdown';
import { Button } from '../../components/ui/Button';
import { PasswordInput } from '../../authentication/components/PasswordInput';
import { AppUser, UserStatus } from '../../types/user';
import { Role } from '../../types/role';
import { createUser, getUserById, updateUser } from '../../services/userService';
import { getRoles } from '../../services/roleService';
import { useMasterData, activeNames } from '../../settings/context/MasterDataContext';
import { colors } from '../../theme/colors';
import { radius, shadow, spacing } from '../../theme/spacing';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddUser'>;

const STATUS_OPTIONS: Array<{ value: UserStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidMobile(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return /^[6-9]\d{9}$/.test(digits);
  if (digits.length === 12 && digits.startsWith('91')) {
    return /^[6-9]\d{9}$/.test(digits.slice(2));
  }
  return false;
}

function ChipMultiSelect({
  title,
  options,
  selected,
  onChange,
  error,
}: {
  title: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
      return;
    }
    onChange([...selected, option]);
  };

  return (
    <View style={styles.chipWrap}>
      <View style={styles.chipHeader}>
        <Text style={styles.chipTitle}>{title}</Text>
        <Text style={styles.selectedCount}>
          {selected.length} Selected
        </Text>
      </View>
      <View style={styles.chipRow}>
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <TouchableOpacity
              key={option}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggle(option)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function AddUserScreen({ navigation, route }: Props) {
  const isEditMode = route.params?.mode === 'edit';
  const master = useMasterData();

  const [existing, setExisting] = useState<AppUser | undefined>(undefined);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleId, setRoleId] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [status, setStatus] = useState<UserStatus>('active');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [branches, setBranches] = useState<string[]>([]);
  const [pincodes, setPincodes] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getRoles()
      .then(setRoles)
      .catch((error) => console.error('[AddUser] Error loading roles:', error));
  }, []);

  useEffect(() => {
    if (isEditMode && route.params?.userId) {
      getUserById(route.params.userId).then((found) => {
        if (found) {
          setExisting(found);
          setName(found.name);
          setEmail(found.email);
          setMobile(found.mobile);
          setRoleId(found.roleId ?? '');
          setRole(found.role);
          setStatus(found.status);
          setBranches(found.branches);
          setPincodes(found.pincodes);
        }
      });
    }
  }, [isEditMode, route.params?.userId]);

  const roleOptions = roles.map((r) => r.name);

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

  const clearFieldError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validate = () => {
    const next: Record<string, string> = {};

    if (!name.trim()) {
      next.name = 'Full Name is required';
    }

    if (!email.trim()) {
      next.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      next.email = 'Enter a valid email address';
    }

    if (!mobile.trim()) {
      next.mobile = 'Mobile Number is required';
    } else if (!isValidMobile(mobile.trim())) {
      next.mobile = 'Enter a valid 10-digit mobile number';
    }

    if (!role) {
      next.role = 'Role is required';
    }

    if (!isEditMode) {
      if (!password.trim()) {
        next.password = 'Password is required';
      } else if (password.length < 6) {
        next.password = 'Password must be at least 6 characters';
      }

      if (!confirmPassword.trim()) {
        next.confirmPassword = 'Confirm Password is required';
      } else if (password !== confirmPassword) {
        next.confirmPassword = 'Password and Confirm Password do not match';
      }
    }

    if (branches.length === 0) {
      next.branches = 'Select at least one branch';
    }

    if (pincodes.length === 0) {
      next.pincodes = 'Select at least one pincode';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goToUserList = () => {
    navigation.navigate('UserList');
  };

  const handleSave = async () => {
    if (!validate() || !role) {
      if (Platform.OS === 'web') {
        window.alert('Validation Error: Please check the form for errors. You may need to scroll down to see missing fields. Errors: ' + JSON.stringify(errors));
      } else {
        Alert.alert('Validation Error', 'Please check the form for errors. You may need to scroll down to see missing fields.');
      }
      return;
    }

    try {
      if (isEditMode && route.params?.userId) {
        const payload: Omit<AppUser, 'id'> = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          mobile: mobile.trim(),
          role,
          roleId: roleId || null,
          status,
          blocked: existing?.blocked ?? false,
          branches,
          pincodes,
          password: existing?.password,
        };

        const updated = await updateUser(route.params.userId, payload);
        if (!updated) {
          Alert.alert('User not found', 'This user could not be updated.');
          return;
        }

        Alert.alert('User Updated', 'User details saved successfully.', [
          { text: 'OK', onPress: goToUserList },
        ]);
        return;
      }

      const payload: Omit<AppUser, 'id'> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
        role,
        roleId: roleId || null,
        status,
        blocked: false,
        branches,
        pincodes,
        password,
      };

      await createUser(payload);
      if (Platform.OS === 'web') {
        window.alert(`User Created Successfully! ${payload.name} has been added to the Users list.`);
        goToUserList();
      } else {
        Alert.alert('User Created Successfully', `${payload.name} has been added to the Users list.`, [
          { text: 'OK', onPress: goToUserList },
        ]);
      }
    } catch (error: any) {
      const message = error?.message || 'Something went wrong. Please try again.';
      if (Platform.OS === 'web') {
        window.alert(`Failed to save user: ${message}`);
      } else {
        Alert.alert('Save Failed', message);
      }
    }
  };

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
            <Text style={styles.headerTitle}>{isEditMode ? 'Edit User' : 'Add User'}</Text>
            <Text style={styles.headerSubtitle}>
              {isEditMode ? 'Update user access details' : 'Create a new admin portal user'}
            </Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, shadow.sm]}>
            <Text style={styles.sectionHeading}>Basic Information</Text>

            <Input
              label="Full Name"
              required
              value={name}
              onChangeText={(text) => {
                setName(text);
                clearFieldError('name');
              }}
              placeholder="Enter full name"
              error={errors.name}
              autoCapitalize="words"
            />
            <Input
              label="Email"
              required
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                clearFieldError('email');
              }}
              placeholder="name@loanex.in"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
            />
            <Input
              label="Mobile Number"
              required
              value={mobile}
              onChangeText={(text) => {
                setMobile(text);
                clearFieldError('mobile');
              }}
              placeholder="+91 98000 00000"
              keyboardType="phone-pad"
              error={errors.mobile}
            />
            <Dropdown
              label="Role *"
              placeholder={roles.length === 0 ? 'Loading roles…' : 'Select role'}
              value={role}
              options={roleOptions}
              onSelect={(value) => {
                const selected = roles.find((r) => r.name === value);
                setRoleId(selected?.id ?? '');
                setRole(value);
                clearFieldError('role');
              }}
              error={errors.role}
            />

            <Text style={styles.statusLabel}>Status</Text>
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((option) => {
                const selected = status === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.statusChip, selected && styles.statusChipActive]}
                    onPress={() => setStatus(option.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.statusChipText, selected && styles.statusChipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {!isEditMode ? (
              <View style={styles.securitySection}>
                <Text style={[styles.sectionHeading, styles.sectionSpaced]}>Security</Text>
                <PasswordInput
                  label="Password *"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    clearFieldError('password');
                  }}
                  placeholder="Enter password"
                  error={errors.password}
                />
                <PasswordInput
                  label="Confirm Password *"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    clearFieldError('confirmPassword');
                  }}
                  placeholder="Re-enter password"
                  error={errors.confirmPassword}
                />
              </View>
            ) : null}

            <Text style={[styles.sectionHeading, styles.sectionSpaced]}>Branch-wise Access</Text>
            <ChipMultiSelect
              title="Assigned Branches"
              options={branchOptions}
              selected={branches}
              onChange={(next) => {
                setBranches(next);
                clearFieldError('branches');
              }}
              error={errors.branches}
            />

            <Text style={[styles.sectionHeading, styles.sectionSpaced]}>Pincode-wise Mapping</Text>
            <ChipMultiSelect
              title="Assigned Pincodes"
              options={pincodeOptions}
              selected={pincodes}
              onChange={(next) => {
                setPincodes(next);
                clearFieldError('pincodes');
              }}
              error={errors.pincodes}
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, shadow.md]}>
          <Button title="Cancel" onPress={() => navigation.goBack()} variant="outline" style={styles.footerBtn} />
          <Button
            title={isEditMode ? 'Save Changes' : 'Add User'}
            onPress={handleSave}
            variant="primary"
            style={styles.footerBtn}
          />
        </View>
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
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textHeading,
    marginBottom: spacing.sm,
  },
  sectionSpaced: {
    marginTop: spacing.lg,
  },
  securitySection: {
    marginTop: spacing.sm,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textHeading,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusChipTextActive: {
    color: colors.primary,
  },
  chipWrap: { marginTop: spacing.xs },
  chipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  chipTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textHeading,
  },
  selectedCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
  fieldError: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.danger,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerBtn: { flex: 1 },
});
