import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Card } from '../ui/Card';
import { SectionTitle } from '../ui/SectionTitle';
import { FiChecklistState } from '../../fi/data/fiWorkflowStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface FiChecklistSectionProps {
  checklist: FiChecklistState;
  readOnly: boolean;
  onToggle: (key: keyof FiChecklistState) => void;
}

const ITEMS: { key: keyof FiChecklistState; label: string }[] = [
  { key: 'customerAvailable', label: 'Customer available' },
  { key: 'addressVerified', label: 'Address verified' },
  { key: 'deliveryLocationVerified', label: 'Product delivery location verified' },
  { key: 'documentsVerified', label: 'Documents verified' },
];

export function FiChecklistSection({ checklist, readOnly, onToggle }: FiChecklistSectionProps) {
  return (
    <Card style={styles.section}>
      <SectionTitle title="Verification Checklist" />
      {ITEMS.map((item, index) => {
        const checked = checklist[item.key];
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.row, index === ITEMS.length - 1 && styles.rowLast]}
            onPress={() => {
              if (!readOnly) onToggle(item.key);
            }}
            activeOpacity={readOnly ? 1 : 0.7}
            disabled={readOnly}
          >
            <Ionicons
              name={checked ? 'checkbox' : 'square-outline'}
              size={22}
              color={checked ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.label, checked && styles.labelChecked]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  labelChecked: {
    fontWeight: '600',
    color: colors.textHeading,
  },
});
