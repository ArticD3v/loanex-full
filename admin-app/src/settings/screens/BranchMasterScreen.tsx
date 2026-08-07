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
import { useMasterData } from '../context/MasterDataContext';
import { MasterFormModal } from '../components/MasterFormModal';
import { MasterStatusBadge } from '../components/MasterStatusBadge';
import {
  BranchFormFields,
  BranchFormState,
  emptyBranchForm,
} from '../components/MasterEntityFormFields';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { colors } from '../../theme/colors';
import { radius, shadow, spacing } from '../../theme/spacing';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BranchMaster'>;

export function BranchMasterScreen({ navigation }: Props) {
  const master = useMasterData();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<BranchFormState | null>(null);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return master.branches;
    return master.branches.filter((b) =>
      [b.name, b.branchCode, b.city, b.state, b.branchManager, b.mobile]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [master.branches, search]);

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
    setForm(emptyBranchForm());
  };

  const openEdit = (id: string) => {
    const item = master.branches.find((b) => b.id === id);
    if (!item) return;
    setError('');
    setForm({ ...item });
  };

  const handleSave = () => {
    if (!form) return;
    if (!form.name.trim()) {
      setError('Branch Name is required');
      return;
    }
    if (!form.branchCode.trim()) {
      setError('Branch Code is required');
      return;
    }
    if (!form.city.trim() || !form.state.trim()) {
      setError('City and State are required');
      return;
    }
    if (!form.branchManager.trim()) {
      setError('Branch Manager is required');
      return;
    }
    if (!form.mobile.trim()) {
      setError('Mobile Number is required');
      return;
    }

    const ok = master.saveBranch(form);
    if (!ok) {
      setError('Branch Name or Branch Code already exists');
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
        <Text style={styles.headerTitle}>Branches</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.searchSection}>
        <View style={[styles.searchBox, shadow.sm]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, code, city, manager..."
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
              {filtered.length} branch{filtered.length === 1 ? '' : 'es'}
            </Text>
            <Button title="+ Add Branch" onPress={openAdd} variant="accent" size="sm" />
          </View>
        }
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Text style={styles.empty}>
              {search.trim()
                ? 'No branches match your search.'
                : 'No branches yet. Add one to get started.'}
            </Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={styles.rowCard}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <View style={styles.nameRow}>
                  <Text style={styles.rowLabel}>{item.name}</Text>
                  <MasterStatusBadge status={item.status} />
                </View>
                <Text style={styles.secondary}>
                  {item.branchCode} · {item.city}, {item.state}
                </Text>
                <Text style={styles.tertiary}>
                  {item.branchManager} · {item.mobile}
                </Text>
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
        title={form?.id ? 'Edit Branch' : 'Add Branch'}
        onClose={() => {
          setForm(null);
          setError('');
        }}
        onSave={handleSave}
      >
        {form ? (
          <BranchFormFields
            value={form}
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
