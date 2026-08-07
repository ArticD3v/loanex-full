import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { colors } from '../../../theme/colors';
import { radius, shadow, spacing } from '../../../theme/spacing';

interface ManageOptionsModalProps {
  visible: boolean;
  title: string;
  entityName: string;
  options: string[];
  onClose: () => void;
  onAdd: (name: string) => boolean;
  onRename: (from: string, to: string) => boolean;
  onDelete: (name: string) => void;
  /** Open directly on the add form (used by "+ Add New" from dropdown). */
  startInAddMode?: boolean;
}

export function ManageOptionsModal({
  visible,
  title,
  entityName,
  options,
  onClose,
  onAdd,
  onRename,
  onDelete,
  startInAddMode = false,
}: ManageOptionsModalProps) {
  const [mode, setMode] = useState<'list' | 'form'>(startInAddMode ? 'form' : 'list');
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setMode(startInAddMode ? 'form' : 'list');
      setEditingValue(null);
      setDraft('');
      setError('');
    }
  }, [visible, startInAddMode]);

  const resetForm = () => {
    if (startInAddMode) {
      onClose();
      return;
    }
    setMode('list');
    setEditingValue(null);
    setDraft('');
    setError('');
  };

  const openAdd = () => {
    setEditingValue(null);
    setDraft('');
    setError('');
    setMode('form');
  };

  const openEdit = (value: string) => {
    setEditingValue(value);
    setDraft(value);
    setError('');
    setMode('form');
  };

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError(`${entityName} name is required`);
      return;
    }

    const ok = editingValue ? onRename(editingValue, trimmed) : onAdd(trimmed);
    if (!ok) {
      setError(`This ${entityName.toLowerCase()} already exists or is invalid`);
      return;
    }
    resetForm();
  };

  const handleDelete = (value: string) => {
    Alert.alert(
      `Delete ${entityName}?`,
      `Are you sure you want to delete "${value}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(value),
        },
      ]
    );
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={[styles.sheet, shadow.lg]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'form'
                ? editingValue
                  ? `Edit ${entityName}`
                  : `Add New ${entityName}`
                : title}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {mode === 'list' ? (
            <>
              <FlatList
                data={options}
                keyExtractor={(item) => item}
                style={styles.list}
                ListEmptyComponent={
                  <Text style={styles.empty}>No {entityName.toLowerCase()}s yet</Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.row}>
                    <Text style={styles.rowLabel} numberOfLines={1}>
                      {item}
                    </Text>
                    <View style={styles.rowActions}>
                      <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
                        <Text style={styles.editIcon}>✎</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn}>
                        <Text style={styles.deleteIcon}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
              <Button title={`+ Add New ${entityName}`} onPress={openAdd} variant="accent" />
            </>
          ) : (
            <View>
              <Input
                label={`${entityName} Name`}
                placeholder={`Enter ${entityName.toLowerCase()} name`}
                value={draft}
                onChangeText={(v) => {
                  setDraft(v);
                  setError('');
                }}
                error={error}
                autoFocus
              />
              <View style={styles.formActions}>
                <Button title="Cancel" onPress={resetForm} variant="outline" style={{ flex: 1 }} />
                <Button title="Save" onPress={handleSave} variant="accent" style={{ flex: 1 }} />
              </View>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.textHeading, flex: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 14, color: colors.textSecondary },
  list: { maxHeight: 280, marginBottom: spacing.lg },
  empty: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic', paddingVertical: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  rowLabel: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
  rowActions: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: { padding: spacing.sm },
  editIcon: { fontSize: 16, color: colors.secondary },
  deleteIcon: { fontSize: 14 },
  formActions: { flexDirection: 'row', gap: spacing.md },
});
