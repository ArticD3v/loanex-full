import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { radius, shadow, spacing } from '../../theme/spacing';

interface MasterFormModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  children: React.ReactNode;
  saveDisabled?: boolean;
}

export function MasterFormModal({
  visible,
  title,
  onClose,
  onSave,
  children,
  saveDisabled,
}: MasterFormModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}
        >
          <Pressable
            style={[styles.sheet, shadow.lg]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
            <View style={styles.footer}>
              <Button title="Cancel" onPress={onClose} variant="outline" style={{ flex: 1 }} />
              <Button
                title="Save"
                onPress={onSave}
                variant="accent"
                style={{ flex: 1 }}
                disabled={saveDisabled}
              />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  keyboard: { maxHeight: '92%' },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    maxHeight: '100%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
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
  scroll: { maxHeight: 480 },
  scrollContent: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.lg },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});
