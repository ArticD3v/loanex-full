import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { SectionTitle } from '../ui/SectionTitle';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';

interface FiVisitSectionProps {
  visitDate: string;
  visitTime: string;
  readOnly: boolean;
  onChangeDate: (value: string) => void;
  onChangeTime: (value: string) => void;
  onFillMock: () => void;
}

export function FiVisitSection({
  visitDate,
  visitTime,
  readOnly,
  onChangeDate,
  onChangeTime,
  onFillMock,
}: FiVisitSectionProps) {
  return (
    <Card style={styles.section}>
      <SectionTitle title="Visit Details" />
      {readOnly ? (
        <View style={styles.readOnlyWrap}>
          <Text style={styles.readOnlyLabel}>Visit Date</Text>
          <Text style={styles.readOnlyValue}>{visitDate || '—'}</Text>
          <Text style={[styles.readOnlyLabel, styles.readOnlySpacer]}>Visit Time</Text>
          <Text style={styles.readOnlyValue}>{visitTime || '—'}</Text>
        </View>
      ) : (
        <>
          <Input
            label="Visit Date"
            placeholder="YYYY-MM-DD"
            value={visitDate}
            onChangeText={onChangeDate}
          />
          <Input
            label="Visit Time"
            placeholder="e.g. 11:30 AM"
            value={visitTime}
            onChangeText={onChangeTime}
          />
          <TouchableOpacity style={styles.mockBtn} onPress={onFillMock} activeOpacity={0.8}>
            <Text style={styles.mockBtnText}>Use Current Visit Date / Time</Text>
          </TouchableOpacity>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.md },
  readOnlyWrap: { gap: spacing.xs },
  readOnlyLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  readOnlySpacer: { marginTop: spacing.md },
  readOnlyValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textHeading,
  },
  mockBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.sm,
  },
  mockBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
