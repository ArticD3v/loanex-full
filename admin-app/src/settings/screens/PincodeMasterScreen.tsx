import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMasterData, activeNames } from '../context/MasterDataContext';
import { MasterFormModal } from '../components/MasterFormModal';
import { MasterStatusBadge } from '../components/MasterStatusBadge';
import {
  PincodeFormFields,
  PincodeFormState,
  emptyPincodeForm,
} from '../components/MasterEntityFormFields';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { colors } from '../../theme/colors';
import { radius, shadow, spacing } from '../../theme/spacing';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PincodeMaster'>;

export function PincodeMasterScreen({ navigation }: Props) {
  const master = useMasterData();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<PincodeFormState | null>(null);
  const [error, setError] = useState('');

  const branchOptions = useMemo(() => {
    const active = activeNames(master.branches);
    if (form?.branchName && !active.includes(form.branchName)) {
      return [form.branchName, ...active];
    }
    return active;
  }, [master.branches, form?.branchName]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return master.pincodes;
    return master.pincodes.filter((p) =>
      [p.pincode, p.city, p.state, p.branchName].join(' ').toLowerCase().includes(q),
    );
  }, [master.pincodes, search]);

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('SettingsHome');
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

  const openAdd = () => {
    setError('');
    setForm(emptyPincodeForm());
  };

  const openEdit = (id: string) => {
    const item = master.pincodes.find((p) => p.id === id);
    if (!item) return;
    setError('');
    setForm({ ...item });
  };

  const handleSave = () => {
    if (!form) return;
    if (!form.pincode.trim()) {
      setError('Pincode is required');
      return;
    }
    if (!/^\d{6}$/.test(form.pincode.trim())) {
      setError('Enter a valid 6-digit pincode');
      return;
    }
    if (!form.city.trim() || !form.state.trim()) {
      setError('City and State are required');
      return;
    }
    if (!form.branchName.trim()) {
      setError('Branch is required');
      return;
    }

    const ok = master.savePincode(form);
    if (!ok) {
      setError('Pincode already exists or branch is invalid');
      return;
    }
    setForm(null);
    setError('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pincode Master</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.searchSection}>
        <View style={[styles.searchBox, shadow.sm]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by pincode, city, branch..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.subtitle}>
              {filtered.length} pincode{filtered.length === 1 ? '' : 's'}
            </Text>
            <Button title="+ Add Pincode" onPress={openAdd} variant="accent" size="sm" />
          </View>
        }
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Text style={styles.empty}>
              {search.trim()
                ? 'No pincodes match your search.'
                : 'No pincodes yet. Add one to get started.'}
            </Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={styles.rowCard}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <View style={styles.nameRow}>
                  <Text style={styles.rowLabel}>{item.pincode}</Text>
                  <MasterStatusBadge status={item.status} />
                </View>
                <Text style={styles.secondary}>
                  {item.city}, {item.state}
                </Text>
                <Text style={styles.tertiary}>Branch: {item.branchName}</Text>
              </View>
              <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item.id)}>
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />

      <MasterFormModal
        visible={!!form}
        title={form?.id ? 'Edit Pincode' : 'Add Pincode'}
        onClose={() => {
          setForm(null);
          setError('');
        }}
        onSave={handleSave}
      >
        {form ? (
          <PincodeFormFields
            value={form}
            branchOptions={branchOptions}
            onChange={(data) => {
              setForm(data);
              setError('');
            }}
            error={error}
          />
        ) : null}
      </MasterFormModal>
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
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  list: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  subtitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  rowCard: { marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowText: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  rowLabel: { fontSize: 15, fontWeight: '700', color: colors.text, flexShrink: 1 },
  secondary: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  tertiary: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  iconBtn: { padding: spacing.sm },
  emptyCard: { marginTop: spacing.sm },
  empty: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic' },
});
