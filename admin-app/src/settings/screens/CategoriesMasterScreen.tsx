import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  BackHandler,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMasterData } from '../context/MasterDataContext';
import { CategoryMaster } from '../types/masterData';
import { MasterFormModal } from '../components/MasterFormModal';
import { MasterStatusBadge } from '../components/MasterStatusBadge';
import {
  CategoryFormFields,
  CategoryFormState,
  emptyCategoryForm,
} from '../components/MasterEntityFormFields';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoriesMaster'>;

export function CategoriesMasterScreen({ navigation }: Props) {
  const { categories, saveCategory, deleteCategory } = useMasterData();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<CategoryFormState | null>(null);
  const [error, setError] = useState('');

  const topLevel = useMemo(() => {
    return categories
      .filter((c) => !c.parentId)
      .sort(
        (a, b) =>
          (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name),
      );
  }, [categories]);

  const childrenOf = useCallback(
    (parentId: string) =>
      categories
        .filter((c) => c.parentId === parentId)
        .sort(
          (a, b) =>
            (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name),
        ),
    [categories],
  );

  const parentOptions = useMemo(() => {
    return topLevel
      .filter((c) => c.id !== form?.id)
      .map((c) => ({ id: c.id, name: c.name }));
  }, [topLevel, form?.id]);

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MastersHome');
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

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openAdd = (parentId: string | null = null) => {
    if (parentId) setExpanded((prev) => ({ ...prev, [parentId]: true }));
    setForm(emptyCategoryForm(parentId));
    setError('');
  };

  const openEdit = (item: CategoryMaster) => {
    setForm({ ...item });
    setError('');
  };

  const closeForm = () => {
    setForm(null);
    setError('');
  };

  const handleSave = () => {
    if (!form) return;
    if (!form.name.trim()) {
      setError('Category name is required');
      return;
    }
    const ok = saveCategory(form);
    if (!ok) {
      setError('This category already exists under the selected parent, or is invalid');
      return;
    }
    closeForm();
  };

  const confirmDelete = (item: CategoryMaster) => {
    const kids = childrenOf(item.id);
    Alert.alert(
      'Delete Category?',
      kids.length > 0
        ? `Delete "${item.name}" and its ${kids.length} sub categor${kids.length === 1 ? 'y' : 'ies'}?`
        : `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteCategory(item.id) },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categories</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.listHeader}>
          <Text style={styles.subtitle}>
            {topLevel.length} categor{topLevel.length === 1 ? 'y' : 'ies'}
          </Text>
          <Button title="+ Add Category" onPress={() => openAdd(null)} variant="accent" size="sm" />
        </View>

        {topLevel.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.empty}>No categories yet. Add one to get started.</Text>
          </Card>
        ) : (
          topLevel.map((category) => {
            const subs = childrenOf(category.id);
            const isOpen = !!expanded[category.id];

            return (
              <Card key={category.id} style={styles.categoryCard}>
                <View style={styles.categoryRow}>
                  <TouchableOpacity
                    style={styles.categoryMain}
                    onPress={() => toggleExpand(category.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isOpen ? 'chevron-down' : 'chevron-forward'}
                      size={18}
                      color={colors.textMuted}
                    />
                    <View style={styles.categoryText}>
                      <View style={styles.nameRow}>
                        <Text style={styles.categoryTitle}>{category.name}</Text>
                        <MasterStatusBadge status={category.status} />
                      </View>
                      <Text style={styles.categoryMeta}>
                        {subs.length} sub categor{subs.length === 1 ? 'y' : 'ies'}
                        {category.displayOrder != null
                          ? ` · Order ${category.displayOrder}`
                          : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.rowActions}>
                    <TouchableOpacity onPress={() => openEdit(category)} style={styles.iconBtn}>
                      <Ionicons name="create-outline" size={20} color={colors.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => confirmDelete(category)}
                      style={styles.iconBtn}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                {isOpen && (
                  <View style={styles.subList}>
                    {subs.map((sub) => (
                      <View key={sub.id} style={styles.subRow}>
                        <View style={styles.subText}>
                          <View style={styles.nameRow}>
                            <Text style={styles.subLabel} numberOfLines={1}>
                              {sub.name}
                            </Text>
                            <MasterStatusBadge status={sub.status} />
                          </View>
                          {sub.displayOrder != null && (
                            <Text style={styles.subMeta}>Order {sub.displayOrder}</Text>
                          )}
                        </View>
                        <View style={styles.rowActions}>
                          <TouchableOpacity
                            onPress={() => openEdit(sub)}
                            style={styles.iconBtn}
                          >
                            <Ionicons name="create-outline" size={18} color={colors.secondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => confirmDelete(sub)}
                            style={styles.iconBtn}
                          >
                            <Ionicons name="trash-outline" size={18} color={colors.danger} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                    {subs.length === 0 && (
                      <Text style={styles.emptySub}>No sub categories yet</Text>
                    )}
                    <TouchableOpacity
                      style={styles.addSubBtn}
                      onPress={() => openAdd(category.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.addSubText}>+ Add Sub Category</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>

      <MasterFormModal
        visible={!!form}
        title={form?.id ? 'Edit Category' : 'Add Category'}
        onClose={closeForm}
        onSave={handleSave}
      >
        {form && (
          <CategoryFormFields
            value={form}
            parentOptions={parentOptions}
            onChange={(next) => {
              setForm(next);
              setError('');
            }}
            error={error}
          />
        )}
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
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
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
  emptyCard: { marginTop: spacing.sm },
  empty: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic' },
  categoryCard: { marginBottom: spacing.md },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryText: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  categoryTitle: { fontSize: 16, fontWeight: '700', color: colors.textHeading },
  categoryMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rowActions: { flexDirection: 'row', gap: spacing.xs },
  iconBtn: { padding: spacing.sm },
  subList: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingLeft: spacing.lg,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  subText: { flex: 1 },
  subLabel: { fontSize: 14, fontWeight: '600', color: colors.text, flexShrink: 1 },
  subMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: spacing.sm,
  },
  addSubBtn: { paddingVertical: spacing.md },
  addSubText: { fontSize: 14, fontWeight: '700', color: colors.accentDark },
});
